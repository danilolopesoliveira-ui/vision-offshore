import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const LeadSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().optional(),
  payload: z.record(z.string(), z.unknown()),
  utmSource: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = LeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const lead = await prisma.simulatorLead.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone ?? null,
        message: parsed.data.message ?? null,
        payload: parsed.data.payload as unknown as import("@prisma/client").Prisma.InputJsonValue,
        utmSource: parsed.data.utmSource ?? null,
      },
    });

    return NextResponse.json({ id: lead.id });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
