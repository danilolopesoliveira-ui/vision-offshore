import { NextResponse } from "next/server";
import { type DocumentCategory } from "@prisma/client";
import { uploadDocument } from "@/lib/storage";
import { getSession } from "@/lib/auth";

const VALID_CATEGORIES = new Set<DocumentCategory>([
  "PERSONAL_ID",
  "ADDRESS_PROOF",
  "GENNESYS_CONTRACT",
  "OBLIGATION_TEMPLATE",
  "INVOICE",
  "PAYMENT_PROOF",
  "OPENING_REQUESTED_DOC",
  "OPENING_FILLED_FORM",
  "OPENING_SIGNED_DOC",
  "ACCOUNTING_REPORT",
  "BANK_STATEMENT",
  "TAX_RETURN",
  "CORPORATE_DOCUMENT",
  "OTHER",
]);

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Não autenticado" } }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Formulário inválido" } }, { status: 400 });
  }

  const file = formData.get("file");
  const category = formData.get("category") as DocumentCategory | null;
  const description = formData.get("description") as string | null;
  const clientName = formData.get("clientName") as string | null;
  const offshoreName = formData.get("offshoreName") as string | null;
  const individualClientId = formData.get("individualClientId") as string | null;
  const offshoreId = formData.get("offshoreId") as string | null;
  const openingProcessId = formData.get("openingProcessId") as string | null;

  if (!(file instanceof File) || !category || !clientName) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Campos obrigatórios ausentes: file, category, clientName" } },
      { status: 400 }
    );
  }

  if (!VALID_CATEGORIES.has(category)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Categoria inválida" } },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const doc = await uploadDocument({
      buffer,
      filename: file.name,
      mimeType: file.type,
      category,
      description: description?.trim() || undefined,
      uploadedById: session.id,
      clientName,
      offshoreName: offshoreName ?? undefined,
      linkage: {
        individualClientId: individualClientId ?? undefined,
        offshoreId: offshoreId ?? undefined,
        openingProcessId: openingProcessId ?? undefined,
      },
    });

    return NextResponse.json({ data: doc });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao fazer upload";
    const isDriveError = message.includes("Drive") || message.includes("Google");
    return NextResponse.json(
      { error: { code: isDriveError ? "DRIVE_ERROR" : "UPLOAD_ERROR", message } },
      { status: isDriveError ? 502 : 500 }
    );
  }
}
