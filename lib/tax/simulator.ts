import { calculateBrazilPjTax, type BrazilPjInput, type BrazilPjOutput } from "./brazil-pj";
import { calculateBrazilPfTax, type BrazilPfInput, type BrazilPfOutput } from "./brazil-pf";
import { calculateForeignPjTax, type ForeignPjInput, type ForeignPjOutput, type PjTaxConfig } from "./foreign-pj";
import { calculateForeignPfTax, type ForeignPfInput, type ForeignPfOutput, type PfTaxConfig } from "./foreign-pf";

export interface SimulationInput {
  mode: "PJ" | "PF" | "BOTH";
  destinationCountry: {
    name: string;
    pjTaxConfig: PjTaxConfig;
    pfTaxConfig: PfTaxConfig;
  };
  pjInput?: BrazilPjInput & ForeignPjInput;
  pfInput?: BrazilPfInput & ForeignPfInput;
}

export interface SimulationResult {
  mode: "PJ" | "PF" | "BOTH";
  brazil: {
    pj?: BrazilPjOutput;
    pf?: BrazilPfOutput;
  };
  destination: {
    pj?: ForeignPjOutput;
    pf?: ForeignPfOutput;
  };
  savings: {
    annualBRL: number;
    annualUSD: number;
    effectiveRateDiff: number;
  };
  disclaimer: string;
}

const DISCLAIMER =
  "As alíquotas refletem regras gerais vigentes na data de atualização e podem variar conforme " +
  "regimes especiais, tratados para evitar dupla tributação e estrutura específica. " +
  "Este simulador é informativo e não constitui assessoria tributária. " +
  "Não considera a Lei 14.754/2023 (tributação CFC de 15% sobre lucros de controladas qualificadas).";

export function runSimulation(input: SimulationInput): SimulationResult {
  const { mode, destinationCountry, pjInput, pfInput } = input;

  const brazilPj = mode !== "PF" && pjInput ? calculateBrazilPjTax(pjInput) : undefined;
  const brazilPf = mode !== "PJ" && pfInput ? calculateBrazilPfTax(pfInput) : undefined;

  const destPj =
    mode !== "PF" && pjInput
      ? calculateForeignPjTax(pjInput, destinationCountry.pjTaxConfig)
      : undefined;

  const destPf =
    mode !== "PJ" && pfInput
      ? calculateForeignPfTax(pfInput, destinationCountry.pfTaxConfig)
      : undefined;

  const brazilTotal = (brazilPj?.totalTaxBRL ?? 0) + (brazilPf?.totalTaxBRL ?? 0);
  const destTotal = (destPj?.totalTaxBRL ?? 0) + (destPf?.totalTaxBRL ?? 0);
  const usdBrlRate = pjInput?.usdBrlRate ?? pfInput?.usdBrlRate ?? 5.0;

  const annualBRL = brazilTotal - destTotal;
  const annualUSD = annualBRL / usdBrlRate;

  const brazilEffective =
    (brazilPj?.effectiveRate ?? 0) * 0.5 + (brazilPf?.effectiveRate ?? 0) * 0.5;
  const destEffective =
    (destPj?.effectiveRate ?? 0) * 0.5 + (destPf?.effectiveRate ?? 0) * 0.5;

  return {
    mode,
    brazil: { pj: brazilPj, pf: brazilPf },
    destination: { pj: destPj, pf: destPf },
    savings: {
      annualBRL,
      annualUSD,
      effectiveRateDiff: brazilEffective - destEffective,
    },
    disclaimer: DISCLAIMER,
  };
}
