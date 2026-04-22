"use server";

import { prisma } from "@/lib/db";
import { withAudit } from "@/lib/audit";
import { requireSession, requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DocumentType } from "@prisma/client";

const AddressSchema = z.object({
  logradouro: z.string().min(1, "Logradouro obrigatório"),
  numero: z.string().min(1, "Número obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(1, "Bairro obrigatório"),
  cidade: z.string().min(1, "Cidade obrigatória"),
  estado: z.string().length(2, "Estado deve ter 2 letras"),
  cep: z.string().min(8, "CEP inválido"),
  pais: z.string().min(1, "País obrigatório"),
});

const ClientSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  documentType: z.nativeEnum(DocumentType),
  documentNumber: z.string().min(1, "Documento obrigatório"),
  totalDeclaredWealthUsd: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? parseFloat(v) : null)),
  address: AddressSchema,
});

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

function parseFormAddress(f: FormData) {
  return {
    logradouro: f.get("logradouro") as string,
    numero: f.get("numero") as string,
    complemento: (f.get("complemento") as string) || undefined,
    bairro: f.get("bairro") as string,
    cidade: f.get("cidade") as string,
    estado: f.get("estado") as string,
    cep: f.get("cep") as string,
    pais: (f.get("pais") as string) || "Brasil",
  };
}

export async function createClientAction(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();

  const raw = {
    name: formData.get("name") as string,
    documentType: formData.get("documentType") as DocumentType,
    documentNumber: formData.get("documentNumber") as string,
    totalDeclaredWealthUsd: formData.get("totalDeclaredWealthUsd") as string,
    address: parseFormAddress(formData),
  };

  const parsed = ClientSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  return withAudit(
    { userId: session.id, entityType: "IndividualClient", entityId: "new", action: "CREATE" },
    async () => {
      const client = await prisma.individualClient.create({
        data: {
          name: parsed.data.name,
          documentType: parsed.data.documentType,
          documentNumber: parsed.data.documentNumber,
          totalDeclaredWealthUsd: parsed.data.totalDeclaredWealthUsd,
          address: parsed.data.address,
        },
      });
      revalidatePath("/clientes");
      redirect(`/clientes/${client.id}`);
    }
  );
}

export async function updateClientAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireSession();

  const raw = {
    name: formData.get("name") as string,
    documentType: formData.get("documentType") as DocumentType,
    documentNumber: formData.get("documentNumber") as string,
    totalDeclaredWealthUsd: formData.get("totalDeclaredWealthUsd") as string,
    address: parseFormAddress(formData),
  };

  const parsed = ClientSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  return withAudit(
    { userId: session.id, entityType: "IndividualClient", entityId: id, action: "UPDATE" },
    async () => {
      await prisma.individualClient.update({
        where: { id },
        data: {
          name: parsed.data.name,
          documentType: parsed.data.documentType,
          documentNumber: parsed.data.documentNumber,
          totalDeclaredWealthUsd: parsed.data.totalDeclaredWealthUsd,
          address: parsed.data.address,
        },
      });
      revalidatePath(`/clientes/${id}`);
      revalidatePath("/clientes");
      redirect(`/clientes/${id}`);
    }
  );
}

export async function deleteClientAction(id: string): Promise<ActionResult> {
  const session = await requireRole("ADMIN", "SUPER_ADMIN");

  return withAudit(
    { userId: session.id, entityType: "IndividualClient", entityId: id, action: "DELETE" },
    async () => {
      await prisma.individualClient.delete({ where: { id } });
      revalidatePath("/clientes");
      redirect("/clientes");
    }
  );
}
