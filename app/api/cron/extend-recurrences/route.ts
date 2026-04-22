import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extendRecurrenceGroup } from "@/lib/obligations";

function assertCronSecret(req: Request): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: Request) {
  if (!assertCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groups = await prisma.obligation.findMany({
    where: { recurrenceGroupId: { not: null }, status: "PENDING" },
    select: { recurrenceGroupId: true },
    distinct: ["recurrenceGroupId"],
  });

  let extended = 0;
  for (const { recurrenceGroupId } of groups) {
    if (!recurrenceGroupId) continue;
    await prisma.$transaction(async (tx) => {
      await extendRecurrenceGroup(tx as unknown as typeof prisma, recurrenceGroupId);
    });
    extended++;
  }

  return NextResponse.json({ ok: true, groupsProcessed: extended });
}
