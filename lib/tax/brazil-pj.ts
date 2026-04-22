export interface BrazilPjInput {
  regime: "SIMPLES" | "PRESUMIDO" | "REAL";
  annualRevenue: number;
  annualProfit: number;
  activity: "SERVICES" | "COMMERCE" | "INDUSTRY";
  dividendsDistributed: number;
}

export interface TaxLineItem {
  tribute: string;
  base: number;
  rate: number;
  amount: number;
}

export interface BrazilPjOutput {
  totalTaxBRL: number;
  effectiveRate: number; // over annualRevenue
  breakdown: TaxLineItem[];
}

// Simples Nacional: approximate effective rates by revenue band (Anexo III/V for services)
// Fonte: LC 123/2006, tabelas vigentes 2025
const SIMPLES_SERVICES_BRACKETS = [
  { upTo: 180_000, rate: 0.06 },
  { upTo: 360_000, rate: 0.112 },
  { upTo: 720_000, rate: 0.135 },
  { upTo: 1_800_000, rate: 0.16 },
  { upTo: 3_600_000, rate: 0.21 },
  { upTo: 4_800_000, rate: 0.33 },
];

const SIMPLES_COMMERCE_BRACKETS = [
  { upTo: 180_000, rate: 0.04 },
  { upTo: 360_000, rate: 0.073 },
  { upTo: 720_000, rate: 0.095 },
  { upTo: 1_800_000, rate: 0.107 },
  { upTo: 3_600_000, rate: 0.143 },
  { upTo: 4_800_000, rate: 0.19 },
];

function getSimplesBracketRate(revenue: number, activity: "SERVICES" | "COMMERCE" | "INDUSTRY"): number {
  const brackets = activity === "SERVICES" ? SIMPLES_SERVICES_BRACKETS : SIMPLES_COMMERCE_BRACKETS;
  for (const b of brackets) {
    if (revenue <= b.upTo) return b.rate;
  }
  return 0.33; // above Simples limit
}

// Lucro Presumido presunção rates (IRPJ/CSLL base)
const PRESUMED_IRPJ_RATE: Record<"SERVICES" | "COMMERCE" | "INDUSTRY", number> = {
  SERVICES: 0.32,
  COMMERCE: 0.08,
  INDUSTRY: 0.08,
};

const PRESUMED_CSLL_RATE: Record<"SERVICES" | "COMMERCE" | "INDUSTRY", number> = {
  SERVICES: 0.32,
  COMMERCE: 0.12,
  INDUSTRY: 0.12,
};

const IRPJ_RATE = 0.15;
const IRPJ_ADDITIONAL_RATE = 0.10;
const IRPJ_ADDITIONAL_THRESHOLD = 240_000; // annual
const CSLL_RATE = 0.09;

export function calculateBrazilPjTax(input: BrazilPjInput): BrazilPjOutput {
  const { regime, annualRevenue, annualProfit, activity } = input;
  const breakdown: TaxLineItem[] = [];

  if (regime === "SIMPLES") {
    const rate = getSimplesBracketRate(annualRevenue, activity);
    const amount = annualRevenue * rate;
    breakdown.push({ tribute: "Simples Nacional", base: annualRevenue, rate, amount });
    return {
      totalTaxBRL: amount,
      effectiveRate: amount / annualRevenue,
      breakdown,
    };
  }

  if (regime === "PRESUMIDO") {
    const irpjBase = annualRevenue * PRESUMED_IRPJ_RATE[activity];
    const csllBase = annualRevenue * PRESUMED_CSLL_RATE[activity];

    const irpj = irpjBase * IRPJ_RATE;
    const irpjAdditional = Math.max(0, irpjBase - IRPJ_ADDITIONAL_THRESHOLD) * IRPJ_ADDITIONAL_RATE;
    const csll = csllBase * CSLL_RATE;
    // PIS + COFINS cumulativo (LP)
    const pis = annualRevenue * 0.0065;
    const cofins = annualRevenue * 0.03;
    // ISS (serviços): ~5% sobre receita — simplified
    const iss = activity === "SERVICES" ? annualRevenue * 0.05 : 0;

    breakdown.push(
      { tribute: "IRPJ (15%)", base: irpjBase, rate: IRPJ_RATE, amount: irpj },
      { tribute: "IRPJ Adicional (10%)", base: Math.max(0, irpjBase - IRPJ_ADDITIONAL_THRESHOLD), rate: IRPJ_ADDITIONAL_RATE, amount: irpjAdditional },
      { tribute: "CSLL (9%)", base: csllBase, rate: CSLL_RATE, amount: csll },
      { tribute: "PIS (0.65%)", base: annualRevenue, rate: 0.0065, amount: pis },
      { tribute: "COFINS (3%)", base: annualRevenue, rate: 0.03, amount: cofins }
    );
    if (iss > 0) {
      breakdown.push({ tribute: "ISS (~5%)", base: annualRevenue, rate: 0.05, amount: iss });
    }

    const total = breakdown.reduce((s, b) => s + b.amount, 0);
    return { totalTaxBRL: total, effectiveRate: total / annualRevenue, breakdown };
  }

  // REAL regime
  const irpj = annualProfit * IRPJ_RATE;
  const irpjAdditional = Math.max(0, annualProfit - IRPJ_ADDITIONAL_THRESHOLD) * IRPJ_ADDITIONAL_RATE;
  const csll = annualProfit * CSLL_RATE;
  // PIS + COFINS não-cumulativo (LR) — shown in breakdown but excluded from effectiveRate
  // because they are indirect taxes; effectiveRate for REAL = income taxes / profit
  const pis = annualRevenue * 0.0165;
  const cofins = annualRevenue * 0.076;

  const incomeTax = irpj + irpjAdditional + csll;

  breakdown.push(
    { tribute: "IRPJ (15%)", base: annualProfit, rate: IRPJ_RATE, amount: irpj },
    { tribute: "IRPJ Adicional (10%)", base: Math.max(0, annualProfit - IRPJ_ADDITIONAL_THRESHOLD), rate: IRPJ_ADDITIONAL_RATE, amount: irpjAdditional },
    { tribute: "CSLL (9%)", base: annualProfit, rate: CSLL_RATE, amount: csll },
    { tribute: "PIS (1.65%)", base: annualRevenue, rate: 0.0165, amount: pis },
    { tribute: "COFINS (7.6%)", base: annualRevenue, rate: 0.076, amount: cofins }
  );

  const total = breakdown.reduce((s, b) => s + b.amount, 0);
  // effectiveRate for Lucro Real = income taxes (IRPJ+CSLL) / profit
  // This makes cross-country comparison meaningful — PIS/COFINS have no equivalent abroad
  const effectiveRate = annualProfit > 0 ? incomeTax / annualProfit : 0;
  return { totalTaxBRL: total, effectiveRate, breakdown };
}
