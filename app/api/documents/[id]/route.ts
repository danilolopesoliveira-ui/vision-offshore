import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deleteFromDrive } from "@/lib/drive";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

interface Props {
  params: Promise<{ id: string }>;
}

export async function DELETE(_req: Request, { params }: Props) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const { id } = await params;

  const doc = await prisma.documentAsset.findUnique({ where: { id } });
  if (!doc) {
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }

  // Remove from Google Drive (non-fatal if already gone)
  if (doc.driveFileId) {
    try {
      await deleteFromDrive(doc.driveFileId);
    } catch {
      // file may have already been deleted externally
    }
  }

  // Remove from Supabase Storage (non-fatal)
  if (doc.supabaseStoragePath) {
    try {
      const supabase = getSupabaseAdmin();
      await supabase.storage.from("documents").remove([doc.supabaseStoragePath]);
    } catch {
      // mirror removal is best-effort
    }
  }

  await prisma.documentAsset.delete({ where: { id } });

  await logAudit({
    userId: session.id,
    entityType: "DocumentAsset",
    entityId: id,
    action: "DELETE_FILE",
    diff: { filename: doc.filename, category: doc.category },
  });

  return NextResponse.json({ data: { id } });
}
