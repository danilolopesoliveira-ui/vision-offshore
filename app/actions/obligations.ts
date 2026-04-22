"use server";

import { prisma } from "@/lib/db";
import { withAudit } from "@/lib/audit";
import { requireSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ObligationStatus } from "@prisma/client";

type AR<T = void> = Promise<{ success: true; data: T } | { success: false; error: string }>;

const UpdateSchema = z.object({
  status: z.nativeEnum(ObligationStatus),
  invoiceValue: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? parseFloat(v) : null)),
  invoiceCurrency: z.string().optional().default("USD"),
  dueDateAdjusted: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? new Date(v) : null)),
  notes: z
    .string()
    .optional()
    .transform((v) => v || null),
  paidAt: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? new Date(v) : null)),
});

export async function updateObligationAction(id: string, formData: FormData): AR {
  const session = await requireSession();

  const parsed = UpdateSchema.safeParse({
    status: formData.get("status"),
    invoiceValue: formData.get("invoiceValue"),
    invoiceCurrency: formData.get("invoiceCurrency") || "USD",
    dueDateAdjusted: formData.get("dueDateAdjusted"),
    notes: formData.get("notes"),
    paidAt: formData.get("paidAt"),
  });

  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const data = parsed.data;

  return withAudit(
    { userId: session.id, entityType: "Obligation", entityId: id, action: "UPDATE" },
    async () => {
      await prisma.obligation.update({
        where: { id },
        data: {
          status: data.status,
          invoiceValue: data.invoiceValue,
          invoiceCurrency: data.invoiceCurrency,
          dueDateAdjusted: data.dueDateAdjusted,
          notes: data.notes,
          paidAt: data.status === "PAID" ? (data.paidAt ?? new Date()) : null,
        },
      });
      revalidatePath("/dashboard");
      revalidatePath("/obrigacoes");
    }
  );
}

export async function markPaidAction(id: string): AR {
  const session = await requireSession();
  return withAudit(
    { userId: session.id, entityType: "Obligation", entityId: id, action: "MARK_PAID" },
    async () => {
      await prisma.obligation.update({
        where: { id },
        data: { status: "PAID", paidAt: new Date() },
      });
      revalidatePath("/dashboard");
      revalidatePath("/obrigacoes");
    }
  );
}

export async function markCancelledAction(id: string): AR {
  const session = await requireSession();
  return withAudit(
    { userId: session.id, entityType: "Obligation", entityId: id, action: "MARK_CANCELLED" },
    async () => {
      await prisma.obligation.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      revalidatePath("/dashboard");
      revalidatePath("/obrigacoes");
    }
  );
}
