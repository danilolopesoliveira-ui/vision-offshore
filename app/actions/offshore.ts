"use server";

import { prisma } from "@/lib/db";
import { withAudit } from "@/lib/audit";
import { requireSession, requireRole } from "@/lib/auth";
import { instantiateJurisdictionObligations } from "@/lib/obligations";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DocumentType, OffshoreStatus } from "@prisma/client";

const JointTenantSchema = z.object({
  name: z.string().min(2, "Nome do cotitular obrigatório"),
  documentType: z.nativeEnum(DocumentType),
  documentNumber: z.string().min(1, "Documento obrigatório"),
  percentage: z
    .string()
    .transform((v) => parseFloat(v))
    .pipe(z.number().positive("Percentual inválido")),
});

const OffshoreSchema = z.object({
  individualClientId: z.string().min(1, "Cliente obrigatório"),
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  jurisdictionId: z.string().min(1, "Jurisdição obrigatória"),
  declaredWealthUsd: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? parseFloat(v) : null)),
  status: z.nativeEnum(OffshoreStatus).optional().default("ACTIVE"),
  jointTenancy: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string };

function parseJointTenants(formData: FormData) {
  const rawCount = formData.get("jointTenantCount");
  const count = rawCount ? parseInt(rawCount as string) : 0;
  const tenants = [];

  for (let i = 0; i < count; i++) {
    tenants.push({
      name: formData.get(`jt_name_${i}`) as string,
      documentType: formData.get(`jt_documentType_${i}`) as string,
      documentNumber: formData.get(`jt_documentNumber_${i}`) as string,
      percentage: formData.get(`jt_percentage_${i}`) as string,
    });
  }
  return tenants;
}

function validateJointTenants(
  jointTenancy: boolean,
  rawTenants: ReturnType<typeof parseJointTenants>
) {
  if (!jointTenancy) return { ok: true, tenants: [] };

  const results = rawTenants.map((t) => JointTenantSchema.safeParse(t));
  const firstError = results.find((r) => !r.success);
  if (firstError && !firstError.success) {
    return { ok: false, error: firstError.error.issues[0]?.message ?? "Cotitular inválido" };
  }

  const tenants = results.map((r) => (r.success ? r.data : null)).filter(Boolean) as z.infer<
    typeof JointTenantSchema
  >[];

  if (tenants.length === 0) {
    return { ok: false, error: "Adicione ao menos um cotitular quando cotitularidade está ativa." };
  }

  const sum = tenants.reduce((acc, t) => acc + t.percentage, 0);
  if (Math.abs(sum - 100) >= 0.01) {
    return {
      ok: false,
      error: `A soma dos percentuais deve ser 100% (atual: ${sum.toFixed(2)}%).`,
    };
  }

  return { ok: true, tenants };
}

export async function createOffshoreAction(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();

  const rawOffshore = {
    individualClientId: formData.get("individualClientId") as string,
    name: formData.get("name") as string,
    jurisdictionId: formData.get("jurisdictionId") as string,
    declaredWealthUsd: formData.get("declaredWealthUsd") as string,
    jointTenancy: formData.get("jointTenancy") as string,
  };

  const parsed = OffshoreSchema.safeParse(rawOffshore);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { ok, tenants, error } = validateJointTenants(
    parsed.data.jointTenancy,
    parseJointTenants(formData)
  );
  if (!ok) return { success: false, error: error! };

  return withAudit(
    {
      userId: session.id,
      entityType: "OffshoreCompany",
      entityId: "new",
      action: "CREATE",
    },
    async () => {
      const offshore = await prisma.$transaction(async (tx) => {
        const o = await tx.offshoreCompany.create({
          data: {
            individualClientId: parsed.data.individualClientId,
            name: parsed.data.name,
            jurisdictionId: parsed.data.jurisdictionId,
            declaredWealthUsd: parsed.data.declaredWealthUsd,
            jointTenancy: parsed.data.jointTenancy,
            status: "ACTIVE",
          },
        });

        if (parsed.data.jointTenancy && tenants!.length > 0) {
          await tx.jointTenant.createMany({
            data: tenants!.map((t) => ({
              offshoreId: o.id,
              name: t.name,
              documentType: t.documentType,
              documentNumber: t.documentNumber,
              percentage: t.percentage,
            })),
          });
        }

        await instantiateJurisdictionObligations(
          tx,
          o.id,
          parsed.data.jurisdictionId,
          new Date()
        );

        return o;
      });

      revalidatePath("/offshore");
      revalidatePath(`/clientes/${parsed.data.individualClientId}`);
      redirect(`/offshore/${offshore.id}`);
    }
  );
}

export async function updateOffshoreAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireSession();

  const rawOffshore = {
    individualClientId: formData.get("individualClientId") as string,
    name: formData.get("name") as string,
    jurisdictionId: formData.get("jurisdictionId") as string,
    declaredWealthUsd: formData.get("declaredWealthUsd") as string,
    jointTenancy: formData.get("jointTenancy") as string,
    status: formData.get("status") as string,
  };

  const parsed = OffshoreSchema.safeParse(rawOffshore);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { ok, tenants, error } = validateJointTenants(
    parsed.data.jointTenancy,
    parseJointTenants(formData)
  );
  if (!ok) return { success: false, error: error! };

  return withAudit(
    { userId: session.id, entityType: "OffshoreCompany", entityId: id, action: "UPDATE" },
    async () => {
      await prisma.$transaction(async (tx) => {
        await tx.offshoreCompany.update({
          where: { id },
          data: {
            name: parsed.data.name,
            jurisdictionId: parsed.data.jurisdictionId,
            declaredWealthUsd: parsed.data.declaredWealthUsd,
            jointTenancy: parsed.data.jointTenancy,
            status: parsed.data.status,
          },
        });

        // Replace joint tenants
        await tx.jointTenant.deleteMany({ where: { offshoreId: id } });
        if (parsed.data.jointTenancy && tenants!.length > 0) {
          await tx.jointTenant.createMany({
            data: tenants!.map((t) => ({
              offshoreId: id,
              name: t.name,
              documentType: t.documentType,
              documentNumber: t.documentNumber,
              percentage: t.percentage,
            })),
          });
        }
      });

      revalidatePath(`/offshore/${id}`);
      revalidatePath("/offshore");
      redirect(`/offshore/${id}`);
    }
  );
}

export async function deleteOffshoreAction(id: string): Promise<ActionResult> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");

  const offshore = await prisma.offshoreCompany.findUnique({
    where: { id },
    select: { individualClientId: true },
  });

  return withAudit(
    { userId: session.id, entityType: "OffshoreCompany", entityId: id, action: "DELETE" },
    async () => {
      await prisma.offshoreCompany.delete({ where: { id } });
      revalidatePath("/offshore");
      if (offshore) revalidatePath(`/clientes/${offshore.individualClientId}`);
      redirect("/offshore");
    }
  );
}
