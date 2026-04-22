import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncDcbeObligations } from "@/lib/dcbe";

function assertCronSecret(req: Request): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: Request) {
  if (!assertCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clients = await prisma.individualClient.findMany({
    where: { offshores: { some: { status: { in: ["ACTIVE", "IN_OPENING"] } } } },
    select: { id: true },
  });

  let processed = 0;
  for (const { id } of clients) {
    await prisma.$transaction(async (tx) => {
      await syncDcbeObligations(id, tx as unknown as typeof prisma);
    });
    processed++;
  }

  return NextResponse.json({ ok: true, clientsProcessed: processed });
}
