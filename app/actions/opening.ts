"use server";

import { prisma } from "@/lib/db";
import { withAudit } from "@/lib/audit";
import { requireSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

type AR<T = void> = Promise<{ success: true; data: T } | { success: false; error: string }>;

export interface ChecklistItem {
  label: string;
  checked: boolean;
}

export interface StageData {
  items: ChecklistItem[];
  notes?: string;
}

const CreateSchema = z.object({
  individualClientId: z.string().min(1, "Cliente obrigatório"),
  jurisdictionId: z.string().min(1, "Jurisdição obrigatória"),
  companyName: z.string().min(2, "Nome da empresa obrigatório"),
});

export async function createOpeningProcessAction(formData: FormData): AR<{ id: string }> {
  const session = await requireSession();

  const parsed = CreateSchema.safeParse({
    individualClientId: formData.get("individualClientId"),
    jurisdictionId: formData.get("jurisdictionId"),
    companyName: formData.get("companyName"),
  });
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  // Load template checklist items for stages 2–4
  const template = await prisma.openingProcessTemplate.findUnique({
    where: { jurisdictionId: parsed.data.jurisdictionId },
  });

  const makeStage = (items: unknown[]): StageData => ({
    items: (items as string[]).map((label) => ({ label, checked: false })),
  });

  const stage1: StageData = {
    items: [
      { label: "Cópia do documento de identidade", checked: false },
      { label: "Comprovante de endereço", checked: false },
      { label: "Formulário de dados pessoais preenchido", checked: false },
    ],
  };

  return withAudit(
    {
      userId: session.id,
      entityType: "OpeningProcess",
      entityId: "new",
      action: "CREATE",
    },
    async () => {
      const process = await prisma.openingProcess.create({
        data: {
          individualClientId: parsed.data.individualClientId,
          jurisdictionId: parsed.data.jurisdictionId,
          currentStage: 1,
          stage1: { ...stage1, companyName: parsed.data.companyName } as object,
          stage2: makeStage(
            Array.isArray(template?.stage2Items) ? (template.stage2Items as string[]) : []
          ) as object,
          stage3: makeStage(
            Array.isArray(template?.stage3Items) ? (template.stage3Items as string[]) : []
          ) as object,
          stage4: makeStage(
            Array.isArray(template?.stage4Items) ? (template.stage4Items as string[]) : []
          ) as object,
        },
      });
      revalidatePath("/abertura");
      redirect(`/abertura/${process.id}`);
    }
  );
}

export async function advanceStageAction(id: string): AR {
  const session = await requireSession();

  const process = await prisma.openingProcess.findUnique({
    where: { id },
    select: { currentStage: true, completedAt: true },
  });
  if (!process) return { success: false, error: "Processo não encontrado" };
  if (process.currentStage >= 4 && process.completedAt)
    return { success: false, error: "Processo já concluído" };

  return withAudit(
    { userId: session.id, entityType: "OpeningProcess", entityId: id, action: "ADVANCE_STAGE" },
    async () => {
      const nextStage = Math.min(process.currentStage + 1, 4);
      await prisma.openingProcess.update({
        where: { id },
        data: {
          currentStage: nextStage,
          completedAt: nextStage === 4 && process.currentStage === 3 ? null : undefined,
        },
      });
      revalidatePath("/abertura");
      revalidatePath(`/abertura/${id}`);
    }
  );
}

export async function retreatStageAction(id: string): AR {
  const session = await requireSession();
  const process = await prisma.openingProcess.findUnique({
    where: { id },
    select: { currentStage: true },
  });
  if (!process) return { success: false, error: "Processo não encontrado" };
  if (process.currentStage <= 1) return { success: false, error: "Já está no estágio 1" };

  return withAudit(
    { userId: session.id, entityType: "OpeningProcess", entityId: id, action: "RETREAT_STAGE" },
    async () => {
      await prisma.openingProcess.update({
        where: { id },
        data: { currentStage: process.currentStage - 1, completedAt: null },
      });
      revalidatePath("/abertura");
      revalidatePath(`/abertura/${id}`);
    }
  );
}

export async function completeOpeningAction(id: string): AR {
  const session = await requireSession();

  return withAudit(
    { userId: session.id, entityType: "OpeningProcess", entityId: id, action: "COMPLETE" },
    async () => {
      await prisma.openingProcess.update({
        where: { id },
        data: { currentStage: 4, completedAt: new Date() },
      });
      revalidatePath("/abertura");
      revalidatePath(`/abertura/${id}`);
    }
  );
}

export async function toggleChecklistItemAction(
  id: string,
  stage: 1 | 2 | 3 | 4,
  itemIndex: number,
  checked: boolean
): AR {
  const session = await requireSession();

  const process = await prisma.openingProcess.findUnique({ where: { id } });
  if (!process) return { success: false, error: "Processo não encontrado" };

  const stageKey = `stage${stage}` as "stage1" | "stage2" | "stage3" | "stage4";
  const stageData = process[stageKey] as unknown as StageData;

  const existing = stageData?.items?.[itemIndex];
  if (!existing) return { success: false, error: "Item não encontrado" };

  const updatedItems = stageData.items.map((item, i) =>
    i === itemIndex ? { label: item.label, checked } : item
  );

  return withAudit(
    {
      userId: session.id,
      entityType: "OpeningProcess",
      entityId: id,
      action: "CHECKLIST_TOGGLE",
    },
    async () => {
      await prisma.openingProcess.update({
        where: { id },
        data: { [stageKey]: { ...stageData, items: updatedItems } as object },
      });
      revalidatePath(`/abertura/${id}`);
    }
  );
}
