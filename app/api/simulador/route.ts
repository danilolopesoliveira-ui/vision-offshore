import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runSimulation } from "@/lib/tax/simulator";
import { z } from "zod";
import type { PjTaxConfig } from "@/lib/tax/foreign-pj";
import type { PfTaxConfig } from "@/lib/tax/foreign-pf";

const InputSchema = z.object({
  mode: z.enum(["PJ", "PF", "BOTH"]),
  countryId: z.string().min(1),
  annualRevenue: z.number().positive(),
  annualProfit: z.number().min(0),
  dividendsDistributed: z.number().min(0),
  usdBrlRate: z.number().positive().default(5.0),
  regime: z.enum(["SIMPLES", "PRESUMIDO", "REAL"]).optional().default("PRESUMIDO"),
  activity: z.enum(["SERVICES", "COMMERCE", "INDUSTRY"]).optional().default("SERVICES"),
  // PF fields
  annualWorkIncome: z.number().min(0).optional().default(0),
  annualDividendIncome: z.number().min(0).optional().default(0),
  annualInterestIncome: z.number().min(0).optional().default(0),
  annualCapitalGains: z.number().min(0).optional().default(0),
  deductions: z.number().min(0).optional().default(0),
  otherTaxableIncome: z.number().min(0).optional().default(0),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = InputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const d = parsed.data;

    const country = await prisma.simulatorCountry.findUnique({
      where: { id: d.countryId },
      select: { name: true, pjTaxConfig: true, pfTaxConfig: true },
    });
    if (!country) {
      return NextResponse.json({ error: "País não encontrado" }, { status: 404 });
    }

    const result = runSimulation({
      mode: d.mode,
      destinationCountry: {
        name: country.name,
        pjTaxConfig: country.pjTaxConfig as unknown as PjTaxConfig,
        pfTaxConfig: country.pfTaxConfig as unknown as PfTaxConfig,
      },
      pjInput:
        d.mode !== "PF"
          ? {
              regime: d.regime,
              annualRevenue: d.annualRevenue,
              annualProfit: d.annualProfit,
              dividendsDistributed: d.dividendsDistributed,
              activity: d.activity,
              usdBrlRate: d.usdBrlRate,
            }
          : undefined,
      pfInput:
        d.mode !== "PJ"
          ? {
              annualWorkIncome: d.annualWorkIncome ?? 0,
              annualDividendIncome: d.annualDividendIncome ?? d.dividendsDistributed,
              annualInterestIncome: d.annualInterestIncome ?? 0,
              annualCapitalGains: d.annualCapitalGains ?? 0,
              deductions: d.deductions ?? 0,
              otherTaxableIncome: d.otherTaxableIncome ?? 0,
              usdBrlRate: d.usdBrlRate,
            }
          : undefined,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[simulador]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
