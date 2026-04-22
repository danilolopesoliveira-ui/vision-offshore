import { createClient } from "@supabase/supabase-js";
import { type DocumentCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ensureDrivePath, uploadToDrive } from "@/lib/drive";
import { logAudit } from "@/lib/audit";
import type { DocumentAsset } from "@prisma/client";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const CATEGORY_FOLDER_MAP: Record<DocumentCategory, string> = {
  PERSONAL_ID: "documentos-pessoais",
  ADDRESS_PROOF: "comprovantes-endereco",
  GENNESYS_CONTRACT: "contratos",
  OBLIGATION_TEMPLATE: "templates",
  INVOICE: "invoices",
  PAYMENT_PROOF: "comprovantes-pagamento",
  OPENING_REQUESTED_DOC: "processo-abertura",
  OPENING_FILLED_FORM: "processo-abertura",
  OPENING_SIGNED_DOC: "processo-abertura",
  OTHER: "outros",
};

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export interface UploadDocumentOptions {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  category: DocumentCategory;
  uploadedById: string;
  clientName: string;
  offshoreName?: string;
  linkage: {
    individualClientId?: string;
    offshoreId?: string;
    openingProcessId?: string;
  };
}

// R5: Drive FIRST. If Drive fails, reject upload entirely.
// Supabase Storage is a non-blocking mirror — failure is logged but not fatal.
export async function uploadDocument(opts: UploadDocumentOptions): Promise<DocumentAsset> {
  if (!ALLOWED_MIME_TYPES.has(opts.mimeType)) {
    throw new Error(`Tipo de arquivo não permitido: ${opts.mimeType}`);
  }

  if (opts.buffer.length > 20 * 1024 * 1024) {
    throw new Error("Arquivo excede o limite de 20MB");
  }

  const categoryFolder = CATEGORY_FOLDER_MAP[opts.category];
  const pathSegments = ["Vision Offshore", opts.clientName];
  if (opts.offshoreName) pathSegments.push(opts.offshoreName);
  pathSegments.push(categoryFolder);

  // Drive upload — must succeed or entire operation fails
  const folderId = await ensureDrivePath(pathSegments);
  const { driveFileId, driveUrl } = await uploadToDrive({
    buffer: opts.buffer,
    filename: opts.filename,
    mimeType: opts.mimeType,
    folderId,
  });

  // Persist DocumentAsset record
  const doc = await prisma.documentAsset.create({
    data: {
      filename: opts.filename,
      mimeType: opts.mimeType,
      sizeBytes: opts.buffer.length,
      driveFileId,
      driveUrl,
      category: opts.category,
      uploadedById: opts.uploadedById,
      individualClientId: opts.linkage.individualClientId ?? null,
      offshoreId: opts.linkage.offshoreId ?? null,
      openingProcessId: opts.linkage.openingProcessId ?? null,
    },
  });

  // Supabase mirror — async, non-blocking
  void mirrorToSupabase(doc.id, opts.buffer, opts.mimeType, opts.linkage.individualClientId);

  await logAudit({
    userId: opts.uploadedById,
    entityType: "DocumentAsset",
    entityId: doc.id,
    action: "UPLOAD_FILE",
    diff: { filename: opts.filename, sizeBytes: opts.buffer.length, driveFileId },
  });

  return doc;
}

async function mirrorToSupabase(
  docId: string,
  buffer: Buffer,
  mimeType: string,
  clientId: string | undefined
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const path = `documents/${clientId ?? "orphan"}/${docId}`;
    const { error } = await supabase.storage
      .from("documents")
      .upload(path, buffer, { contentType: mimeType, upsert: false });

    if (error) throw error;

    await prisma.documentAsset.update({
      where: { id: docId },
      data: { supabaseStoragePath: path },
    });
  } catch (err) {
    console.error("[storage] Supabase mirror failed for doc:", docId, err);
  }
}
