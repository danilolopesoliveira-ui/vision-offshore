import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { code } = await request.json();
    if (!code || typeof code !== "string") {
      return NextResponse.json({ valid: false, error: "Código obrigatório." }, { status: 400 });
    }

    const accessCode = await prisma.accessCode.findUnique({
      where: { code: code.trim().toUpperCase() },
      select: { usedBy: true, expiresAt: true, intendedRole: true },
    });

    if (!accessCode) {
      return NextResponse.json({ valid: false, error: "Código não encontrado." });
    }
    if (accessCode.usedBy) {
      return NextResponse.json({ valid: false, error: "Código já utilizado." });
    }
    if (accessCode.expiresAt < new Date()) {
      return NextResponse.json({ valid: false, error: "Código expirado." });
    }

    return NextResponse.json({ valid: true, role: accessCode.intendedRole });
  } catch {
    return NextResponse.json({ valid: false, error: "Erro interno." }, { status: 500 });
  }
}
