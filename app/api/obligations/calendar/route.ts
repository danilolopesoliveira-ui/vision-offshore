import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/auth";

// Color per status
const COLOR: Record<string, string> = {
  PENDING: "#16a34a",   // emerald-600
  PAID:    "#64748b",   // slate-500
  CANCELLED: "#94a3b8", // slate-400
};

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end)
    return NextResponse.json({ error: "Missing start/end" }, { status: 400 });

  const obligations = await prisma.obligation.findMany({
    where: {
      OR: [
        { dueDateOriginal: { gte: new Date(start), lte: new Date(end) } },
        { dueDateAdjusted: { gte: new Date(start), lte: new Date(end) } },
      ],
    },
    select: {
      id: true,
      nature: true,
      status: true,
      dueDateOriginal: true,
      dueDateAdjusted: true,
      invoiceValue: true,
      invoiceCurrency: true,
      offshore: { select: { name: true } },
    },
    orderBy: { dueDateOriginal: "asc" },
  });

  const events = obligations.map((o) => ({
    id: o.id,
    title: `${o.offshore.name} — ${o.nature}`,
    start: (o.dueDateAdjusted ?? o.dueDateOriginal).toISOString().split("T")[0],
    color: COLOR[o.status] ?? COLOR.PENDING,
    extendedProps: {
      status: o.status,
      offshoreName: o.offshore.name,
      nature: o.nature,
      invoiceValue: o.invoiceValue,
      invoiceCurrency: o.invoiceCurrency,
    },
  }));

  return NextResponse.json(events);
}
