export interface PjTaxConfig {
  corporateIncomeTax: { rate: number; base: "profit" | "revenue"; notes?: string };
  stateIncomeTax?: { rate: number; condition?: string };
  dividendWithholding: { standard: number; treatyBrazil?: number | null; notes?: string };
  capitalGainsTax?: { rate: number };
  annualFees?: Array<{ name: string; value: number; currency: string }>;
  participationExemption?: boolean;
  effectiveRateHint: string;
  combinedRate?: { rate: number; notes?: string };
  [key: string]: unknown;
}

export interface ForeignPjInput {
  annualRevenue: number;
  annualProfit: number;
  dividendsDistributed: number;
  usdBrlRate: number;
}

export interface ForeignPjOutput {
  totalTaxBRL: number;
  totalTaxUSD: number;
  effectiveRate: number;
  breakdown: Array<{ tribute: string; base: number; rate: number; amountUSD: number; amountBRL: number }>;
  annualFeesUSD: number;
  disclaimer: string;
}

export function calculateForeignPjTax(
  input: ForeignPjInput,
  config: PjTaxConfig
): ForeignPjOutput {
  const { annualRevenue, annualProfit, dividendsDistributed, usdBrlRate } = input;
  const breakdown: ForeignPjOutput["breakdown"] = [];

  // Use combinedRate if available (e.g., Luxembourg), otherwise compute
  const citRate = config.combinedRate?.rate ?? config.corporateIncomeTax.rate;
  const citBase = config.corporateIncomeTax.base === "revenue" ? annualRevenue : annualProfit;
  const cit = citBase * citRate;

  if (cit > 0) {
    breakdown.push({
      tribute: `CIT (${(citRate * 100).toFixed(2)}%)`,
      base: citBase,
      rate: citRate,
      amountUSD: cit,
      amountBRL: cit * usdBrlRate,
    });
  }

  // State income tax
  if (config.stateIncomeTax) {
    const stateTax = annualProfit * config.stateIncomeTax.rate;
    breakdown.push({
      tribute: `State Tax (${(config.stateIncomeTax.rate * 100).toFixed(2)}%)`,
      base: annualProfit,
      rate: config.stateIncomeTax.rate,
      amountUSD: stateTax,
      amountBRL: stateTax * usdBrlRate,
    });
  }

  // Dividend withholding (use treaty rate with Brazil if available)
  const whtRate = config.dividendWithholding.treatyBrazil ?? config.dividendWithholding.standard;
  const wht = dividendsDistributed * whtRate;
  if (wht > 0) {
    breakdown.push({
      tribute: `WHT Dividendos (${(whtRate * 100).toFixed(0)}%)`,
      base: dividendsDistributed,
      rate: whtRate,
      amountUSD: wht,
      amountBRL: wht * usdBrlRate,
    });
  }

  const annualFeesUSD =
    config.annualFees?.reduce((s, f) => {
      // Assume fees in USD; other currencies are approximations
      return s + f.value;
    }, 0) ?? 0;

  const totalTaxUSD = breakdown.reduce((s, b) => s + b.amountUSD, 0) + annualFeesUSD;
  const totalTaxBRL = totalTaxUSD * usdBrlRate;
  const effectiveBase = annualProfit > 0 ? annualProfit : annualRevenue;

  return {
    totalTaxBRL,
    totalTaxUSD,
    effectiveRate: effectiveBase > 0 ? totalTaxUSD / effectiveBase : 0,
    breakdown,
    annualFeesUSD,
    disclaimer:
      "Não considera aplicação da Lei 14.754/2023 (CFC) — tributação de 15% sobre lucros de controladas qualificadas para residentes fiscais no Brasil.",
  };
}
