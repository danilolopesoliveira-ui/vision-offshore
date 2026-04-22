"use server";

import { prisma } from "@/lib/db";
import { withAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Recurrence, UserRole } from "@prisma/client";
import { nanoid } from "nanoid";
import { addDays } from "date-fns";

type AR<T = void> = Promise<{ success: true; data: T } | { success: false; error: string }>;

// ─── Jurisdições ───────────────────────────────────────────────────────────

const JurisdictionSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  countryCode: z.string().length(2, "Código de país deve ter 2 letras"),
  isTaxHaven: z.string().transform((v) => v === "true"),
  active: z.string().transform((v) => v !== "false"),
});

export async function createJurisdictionAction(formData: FormData): AR<{ id: string }> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = JurisdictionSchema.safeParse({
    name: formData.get("name"),
    countryCode: (formData.get("countryCode") as string)?.toUpperCase(),
    isTaxHaven: formData.get("isTaxHaven") ?? "false",
    active: "true",
  });
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  return withAudit(
    { userId: session.id, entityType: "Jurisdiction", entityId: "new", action: "CREATE" },
    async () => {
      const j = await prisma.jurisdiction.create({ data: parsed.data });
      revalidatePath("/admin/jurisdicoes");
      redirect("/admin/jurisdicoes");
    }
  );
}

export async function updateJurisdictionAction(id: string, formData: FormData): AR {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = JurisdictionSchema.safeParse({
    name: formData.get("name"),
    countryCode: (formData.get("countryCode") as string)?.toUpperCase(),
    isTaxHaven: formData.get("isTaxHaven") ?? "false",
    active: formData.get("active") ?? "true",
  });
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  return withAudit(
    { userId: session.id, entityType: "Jurisdiction", entityId: id, action: "UPDATE" },
    async () => {
      await prisma.jurisdiction.update({ where: { id }, data: parsed.data });
      revalidatePath("/admin/jurisdicoes");
      redirect("/admin/jurisdicoes");
    }
  );
}

// ─── Obligation Templates ─────────────────────────────────────────────────

const TemplateSchema = z.object({
  jurisdictionId: z.string().min(1, "Jurisdição obrigatória"),
  nature: z.string().min(2, "Natureza obrigatória"),
  recurrence: z.nativeEnum(Recurrence),
  serviceProviderId: z
    .string()
    .optional()
    .transform((v) => v || null),
  invoiceValue: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? parseFloat(v) : null)),
  invoiceCurrency: z.string().default("USD"),
  penaltyValue: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? parseFloat(v) : null)),
  penaltyCondition: z
    .string()
    .optional()
    .transform((v) => v || null),
  anchorMonth: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? parseInt(v) : null)),
  anchorDay: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? parseInt(v) : null)),
  active: z.string().transform((v) => v !== "false"),
});

export async function createTemplateAction(formData: FormData): AR<{ id: string }> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = TemplateSchema.safeParse({
    jurisdictionId: formData.get("jurisdictionId"),
    nature: formData.get("nature"),
    recurrence: formData.get("recurrence"),
    serviceProviderId: formData.get("serviceProviderId"),
    invoiceValue: formData.get("invoiceValue"),
    invoiceCurrency: formData.get("invoiceCurrency") || "USD",
    penaltyValue: formData.get("penaltyValue"),
    penaltyCondition: formData.get("penaltyCondition"),
    anchorMonth: formData.get("anchorMonth"),
    anchorDay: formData.get("anchorDay"),
    active: "true",
  });
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  return withAudit(
    { userId: session.id, entityType: "ObligationTemplate", entityId: "new", action: "CREATE" },
    async () => {
      const t = await prisma.obligationTemplate.create({ data: parsed.data });
      revalidatePath("/admin/templates");
      redirect("/admin/templates");
    }
  );
}

export async function updateTemplateAction(id: string, formData: FormData): AR {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = TemplateSchema.safeParse({
    jurisdictionId: formData.get("jurisdictionId"),
    nature: formData.get("nature"),
    recurrence: formData.get("recurrence"),
    serviceProviderId: formData.get("serviceProviderId"),
    invoiceValue: formData.get("invoiceValue"),
    invoiceCurrency: formData.get("invoiceCurrency") || "USD",
    penaltyValue: formData.get("penaltyValue"),
    penaltyCondition: formData.get("penaltyCondition"),
    anchorMonth: formData.get("anchorMonth"),
    anchorDay: formData.get("anchorDay"),
    active: formData.get("active") ?? "true",
  });
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  return withAudit(
    { userId: session.id, entityType: "ObligationTemplate", entityId: id, action: "UPDATE" },
    async () => {
      await prisma.obligationTemplate.update({ where: { id }, data: parsed.data });
      revalidatePath("/admin/templates");
      redirect("/admin/templates");
    }
  );
}

// ─── Prestadores ──────────────────────────────────────────────────────────

const ProviderSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  portalUrl: z
    .string()
    .optional()
    .transform((v) => v || null),
  responsibleName: z
    .string()
    .optional()
    .transform((v) => v || null),
  responsiblePhone: z
    .string()
    .optional()
    .transform((v) => v || null),
  active: z.string().transform((v) => v !== "false"),
});

export async function createProviderAction(formData: FormData): AR<{ id: string }> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = ProviderSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    portalUrl: formData.get("portalUrl"),
    responsibleName: formData.get("responsibleName"),
    responsiblePhone: formData.get("responsiblePhone"),
    active: "true",
  });
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  return withAudit(
    { userId: session.id, entityType: "ServiceProvider", entityId: "new", action: "CREATE" },
    async () => {
      const p = await prisma.$transaction(async (tx) => {
        const provider = await tx.serviceProvider.create({ data: parsed.data });

        const username = formData.get("credUsername") as string | null;
        const password = formData.get("credPassword") as string | null;
        if (username && password) {
          await tx.serviceProviderCredential.create({
            data: {
              providerId: provider.id,
              encryptedUsername: encrypt(username),
              encryptedPassword: encrypt(password),
            },
          });
        }
        return provider;
      });
      revalidatePath("/admin/prestadores");
      redirect("/admin/prestadores");
    }
  );
}

export async function updateProviderAction(id: string, formData: FormData): AR {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");
  const parsed = ProviderSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    portalUrl: formData.get("portalUrl"),
    responsibleName: formData.get("responsibleName"),
    responsiblePhone: formData.get("responsiblePhone"),
    active: formData.get("active") ?? "true",
  });
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  return withAudit(
    { userId: session.id, entityType: "ServiceProvider", entityId: id, action: "UPDATE" },
    async () => {
      await prisma.$transaction(async (tx) => {
        await tx.serviceProvider.update({ where: { id }, data: parsed.data });

        const username = formData.get("credUsername") as string | null;
        const password = formData.get("credPassword") as string | null;
        if (username && password) {
          await tx.serviceProviderCredential.upsert({
            where: { providerId: id },
            create: {
              providerId: id,
              encryptedUsername: encrypt(username),
              encryptedPassword: encrypt(password),
            },
            update: {
              encryptedUsername: encrypt(username),
              encryptedPassword: encrypt(password),
              keyVersion: { increment: 1 },
            },
          });
        }
      });
      revalidatePath("/admin/prestadores");
      redirect("/admin/prestadores");
    }
  );
}

// ─── Usuários / Access Codes ──────────────────────────────────────────────

const AccessCodeSchema = z.object({
  intendedRole: z.nativeEnum(UserRole),
  expiresInDays: z
    .string()
    .transform((v) => parseInt(v))
    .pipe(z.number().min(1).max(365)),
});

export async function generateAccessCodeAction(formData: FormData): AR<{ code: string }> {
  const session = await requireRole("SUPER_ADMIN");
  const parsed = AccessCodeSchema.safeParse({
    intendedRole: formData.get("intendedRole"),
    expiresInDays: formData.get("expiresInDays") ?? "30",
  });
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  return withAudit(
    { userId: session.id, entityType: "AccessCode", entityId: "new", action: "GENERATE" },
    async () => {
      const code = `GENNESYS-${nanoid(8).toUpperCase()}`;
      const accessCode = await prisma.accessCode.create({
        data: {
          code,
          createdById: session.id,
          intendedRole: parsed.data.intendedRole,
          expiresAt: addDays(new Date(), parsed.data.expiresInDays),
        },
      });
      revalidatePath("/admin/usuarios");
      return { code: accessCode.code };
    }
  );
}

export async function updateUserRoleAction(userId: string, formData: FormData): AR {
  const session = await requireRole("SUPER_ADMIN");
  const role = formData.get("role") as UserRole;
  if (!Object.values(UserRole).includes(role))
    return { success: false, error: "Role inválido" };

  return withAudit(
    { userId: session.id, entityType: "User", entityId: userId, action: "UPDATE_ROLE" },
    async () => {
      await prisma.user.update({ where: { id: userId }, data: { role } });
      revalidatePath("/admin/usuarios");
    }
  );
}
