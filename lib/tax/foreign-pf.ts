export interface PfTaxConfig {
  incomeTax: {
    type: "progressive" | "flat";
    brackets?: Array<{ upTo: number | null; rate: number; currency: string; notes?: string }>;
    flatRate?: number;
  };
  dividendIncome: { rate: number; notes?: string };
  interestIncome: { rate: number };
  capitalGainsTax: { shortTerm: number; longTerm?: number };
  wealthTax?: { rate: number; description: string };
  specialRegimes?: Array<{ name: string; description: string; flatRate?: number; duration?: number }>;
  effectiveRateHint?: string;
}

export interface ForeignPfInput {
  annualWorkIncome: number;
  annualDividendIncome: number;
  annualInterestIncome: number;
  annualCapitalGains: number;
  usdBrlRate: number;
}

export interface ForeignPfOutput {
  totalTaxBRL: number;
  totalTaxUSD: number;
  effectiveRate: number;
  breakdown: Array<{ tribute: string; base: number; rate: number; amountUSD: number; amountBRL: number }>;
}

function applyProgressiveBrackets(
  income: number,
  brackets: NonNullable<PfTaxConfig["incomeTax"]["brackets"]>
): number {
  let tax = 0;
  let prev = 0;
  for (const bracket of brackets) {
    const cap = bracket.upTo ?? Infinity;
    const taxable = Math.min(income, cap) - prev;
    if (taxable <= 0) break;
    tax += taxable * bracket.rate;
    prev = cap;
    if (income <= cap) break;
  }
  return tax;
}

export function calculateForeignPfTax(
  input: ForeignPfInput,
  config: PfTaxConfig
): ForeignPfOutput {
  const { annualWorkIncome, annualDividendIncome, annualInterestIncome, annualCapitalGains, usdBrlRate } = input;
  const breakdown: ForeignPfOutput["breakdown"] = [];

  // Work income
  if (annualWorkIncome > 0) {
    let tax: number;
    if (config.incomeTax.type === "flat") {
      tax = annualWorkIncome * (config.incomeTax.flatRate ?? 0);
    } else {
      tax = applyProgressiveBrackets(annualWorkIncome, config.incomeTax.brackets ?? []);
    }
    const rate = annualWorkIncome > 0 ? tax / annualWorkIncome : 0;
    breakdown.push({
      tribute: "IR Renda Trabalho",
      base: annualWorkIncome,
      rate,
      amountUSD: tax,
      amountBRL: tax * usdBrlRate,
    });
  }

  // Dividend income
  if (annualDividendIncome > 0 && config.dividendIncome.rate > 0) {
    const tax = annualDividendIncome * config.dividendIncome.rate;
    breakdown.push({
      tribute: "IR Dividendos",
      base: annualDividendIncome,
      rate: config.dividendIncome.rate,
      amountUSD: tax,
      amountBRL: tax * usdBrlRate,
    });
  }

  // Interest income
  if (annualInterestIncome > 0 && config.interestIncome.rate > 0) {
    const tax = annualInterestIncome * config.interestIncome.rate;
    breakdown.push({
      tribute: "IR Renda Fixa",
      base: annualInterestIncome,
      rate: config.interestIncome.rate,
      amountUSD: tax,
      amountBRL: tax * usdBrlRate,
    });
  }

  // Capital gains
  if (annualCapitalGains > 0 && config.capitalGainsTax.longTerm !== 0) {
    const rate = config.capitalGainsTax.longTerm ?? config.capitalGainsTax.shortTerm;
    const tax = annualCapitalGains * rate;
    breakdown.push({
      tribute: "IR Ganho de Capital",
      base: annualCapitalGains,
      rate,
      amountUSD: tax,
      amountBRL: tax * usdBrlRate,
    });
  }

  const totalTaxUSD = breakdown.reduce((s, b) => s + b.amountUSD, 0);
  const totalIncome = annualWorkIncome + annualDividendIncome + annualInterestIncome + annualCapitalGains;

  return {
    totalTaxBRL: totalTaxUSD * usdBrlRate,
    totalTaxUSD,
    effectiveRate: totalIncome > 0 ? totalTaxUSD / totalIncome : 0,
    breakdown,
  };
}
