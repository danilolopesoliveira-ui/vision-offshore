export interface BrazilPfInput {
  annualWorkIncome: number;
  annualDividendIncome: number;
  annualInterestIncome: number;
  annualCapitalGains: number;
  otherTaxableIncome: number;
  deductions: number;
}

export interface BrazilPfOutput {
  totalTaxBRL: number;
  effectiveRate: number;
  breakdown: Array<{ tribute: string; base: number; rate: number; amount: number }>;
}

// Tabela IRPF 2026 (anual)
// Fonte: RIR 2024, Tabela Progressiva Mensal × 12
const BRACKETS = [
  { upTo: 29_145.60, rate: 0, deduction: 0 },
  { upTo: 33_919.80, rate: 0.075, deduction: 2_185.92 },
  { upTo: 45_012.60, rate: 0.15, deduction: 4_733.99 },
  { upTo: 55_976.16, rate: 0.225, deduction: 8_121.45 },
  { upTo: Infinity, rate: 0.275, deduction: 10_920.53 },
];

function calculateProgressiveIRPF(taxableIncome: number): number {
  for (const bracket of BRACKETS) {
    if (taxableIncome <= bracket.upTo) {
      return Math.max(0, taxableIncome * bracket.rate - bracket.deduction);
    }
  }
  return 0;
}

export function calculateBrazilPfTax(input: BrazilPfInput): BrazilPfOutput {
  const {
    annualWorkIncome,
    annualDividendIncome, // currently exempt (Lei 9.249/1995)
    annualInterestIncome,
    annualCapitalGains,
    otherTaxableIncome,
    deductions,
  } = input;

  const breakdown: BrazilPfOutput["breakdown"] = [];
  const totalIncome =
    annualWorkIncome + annualDividendIncome + annualInterestIncome + annualCapitalGains + otherTaxableIncome;

  // Work income: progressive IRPF
  const workBase = Math.max(0, annualWorkIncome + otherTaxableIncome - deductions);
  const irpf = calculateProgressiveIRPF(workBase);
  if (irpf > 0) {
    breakdown.push({
      tribute: "IRPF (tabela progressiva)",
      base: workBase,
      rate: workBase > 0 ? irpf / workBase : 0,
      amount: irpf,
    });
  }

  // Interest income: 17.5% average (regressiva 15–22.5%)
  if (annualInterestIncome > 0) {
    const tax = annualInterestIncome * 0.175;
    breakdown.push({ tribute: "IR Renda Fixa (17.5% médio)", base: annualInterestIncome, rate: 0.175, amount: tax });
  }

  // Capital gains: 15% up to R$ 5M
  if (annualCapitalGains > 0) {
    const tax = annualCapitalGains * 0.15;
    breakdown.push({ tribute: "IR Ganho de Capital (15%)", base: annualCapitalGains, rate: 0.15, amount: tax });
  }

  // Dividends: currently exempt
  if (annualDividendIncome > 0) {
    breakdown.push({ tribute: "Dividendos (isentos)", base: annualDividendIncome, rate: 0, amount: 0 });
  }

  const total = breakdown.reduce((s, b) => s + b.amount, 0);
  return {
    totalTaxBRL: total,
    effectiveRate: totalIncome > 0 ? total / totalIncome : 0,
    breakdown,
  };
}
