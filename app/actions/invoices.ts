"use server";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { ensureDrivePath, uploadToDrive } from "@/lib/drive";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { InvoicePDF } from "@/lib/pdf/invoice-pdf";
import path from "path";
import fs from "fs";
import type { InvoiceItem } from "@/lib/pdf/invoice-pdf";
import { buildInvoiceNumber } from "@/lib/invoice-utils";

type AR<T = void> = Promise<{ success: true; data: T } | { success: false; error: string }>;

// ── Zod schemas ──────────────────────────────────────────────────────────────
const InvoiceItemSchema = z.object({
  description: z.string().min(1, "Descrição obrigatória"),
  amount: z.number(),
});

const CreateInvoiceSchema = z.object({
  recipientName: z.string().min(1, "Nome do destinatário obrigatório"),
  recipientAddress: z.string().min(1, "Endereço obrigatório"),
  issueDate: z.string().min(1, "Data obrigatória"),
  currency: z.string().default("USD"),
  items: z
    .array(InvoiceItemSchema)
    .min(1, "Adicione ao menos um item"),
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;

// ── PDF generation helper ────────────────────────────────────────────────────
async function generatePDFBuffer(
  invoiceNumber: string,
  issueDate: Date,
  recipientName: string,
  recipientAddress: string,
  items: InvoiceItem[],
  total: number,
  currency: string,
): Promise<Buffer> {
  const logoPath = path.join(process.cwd(), "public", "zahav-logo.png");
  const logoExists = fs.existsSync(logoPath);

  const element = React.createElement(InvoicePDF, {
    invoiceNumber,
    issueDate,
    recipient: { name: recipientName, address: recipientAddress },
    items,
    total,
    currency,
    logoPath: logoExists ? logoPath : null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

  const arrayBuffer = await renderToBuffer(element);
  return Buffer.from(arrayBuffer);
}

// ── createInvoiceAction ──────────────────────────────────────────────────────
export async function createInvoiceAction(
  input: CreateInvoiceInput,
): AR<{ id: string; invoiceNumber: string }> {
  const session = await requireSession();

  const parsed = CreateInvoiceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }

  const { recipientName, recipientAddress, issueDate, currency, items } = parsed.data;

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const date = new Date(issueDate);
  const invoiceNumber = buildInvoiceNumber(recipientName, total, date);

  // Check for duplicate invoice number
  const existing = await prisma.invoice.findUnique({ where: { invoiceNumber } });
  if (existing) {
    return {
      success: false,
      error: `Já existe uma invoice com o número ${invoiceNumber}.`,
    };
  }

  // Generate PDF
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generatePDFBuffer(
      invoiceNumber,
      date,
      recipientName,
      recipientAddress,
      items as InvoiceItem[],
      total,
      currency,
    );
  } catch (err) {
    console.error("[invoices] PDF generation failed:", err);
    return { success: false, error: "Erro ao gerar PDF da invoice." };
  }

  // Upload to Google Drive: Vision Offshore/Invoices/{recipientName}/
  let driveFileId: string | null = null;
  let driveUrl: string | null = null;
  try {
    const folderId = await ensureDrivePath([
      "Vision Offshore",
      "Invoices",
      recipientName,
    ]);
    const result = await uploadToDrive({
      buffer: pdfBuffer,
      filename: `${invoiceNumber}.pdf`,
      mimeType: "application/pdf",
      folderId,
    });
    driveFileId = result.driveFileId;
    driveUrl = result.driveUrl;
  } catch (err) {
    console.error("[invoices] Drive upload failed:", err);
    // Continue — save the record even if Drive fails
  }

  // Persist to DB
  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      recipientName,
      recipientAddress,
      items: items as object[],
      total,
      currency,
      issueDate: date,
      driveFileId,
      driveUrl,
      createdById: session.id,
    },
  });

  await logAudit({
    userId: session.id,
    entityType: "Invoice",
    entityId: invoice.id,
    action: "CREATE",
    diff: { invoiceNumber, recipientName, total, currency },
  });

  revalidatePath("/invoices");

  return { success: true, data: { id: invoice.id, invoiceNumber } };
}

// ── deleteInvoiceAction ──────────────────────────────────────────────────────
export async function deleteInvoiceAction(id: string): AR {
  const session = await requireSession();

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return { success: false, error: "Invoice não encontrada." };

  await prisma.invoice.delete({ where: { id } });

  await logAudit({
    userId: session.id,
    entityType: "Invoice",
    entityId: id,
    action: "DELETE",
    diff: { invoiceNumber: invoice.invoiceNumber },
  });

  revalidatePath("/invoices");
  return { success: true, data: undefined };
}

// ── listInvoicesAction ───────────────────────────────────────────────────────
export async function listInvoicesAction(opts?: { q?: string; page?: number }) {
  const PAGE_SIZE = 30;
  const page = opts?.page ?? 1;
  const q = opts?.q ?? "";
  const skip = (page - 1) * PAGE_SIZE;

  const where = q
    ? {
        OR: [
          { recipientName: { contains: q, mode: "insensitive" as const } },
          { invoiceNumber: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        invoiceNumber: true,
        recipientName: true,
        total: true,
        currency: true,
        issueDate: true,
        driveUrl: true,
        createdAt: true,
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  return { invoices, total, totalPages: Math.ceil(total / PAGE_SIZE) };
}
