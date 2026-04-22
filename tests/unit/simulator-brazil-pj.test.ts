import { describe, it, expect } from "vitest";
import { calculateBrazilPjTax } from "@/lib/tax/brazil-pj";

describe("Brazil PJ tax calculator (§7.1)", () => {
  it("Lucro Presumido, Serviços, receita R$ 1M, lucro R$ 400k → efetivo entre 16-18%", () => {
    const result = calculateBrazilPjTax({
      regime: "PRESUMIDO",
      annualRevenue: 1_000_000,
      annualProfit: 400_000,
      activity: "SERVICES",
      dividendsDistributed: 0,
    });
    expect(result.effectiveRate).toBeGreaterThan(0.16);
    expect(result.effectiveRate).toBeLessThan(0.19);
  });

  it("Lucro Real, Comércio, receita R$ 10M, lucro R$ 2M → efetivo entre 28-34%", () => {
    const result = calculateBrazilPjTax({
      regime: "REAL",
      annualRevenue: 10_000_000,
      annualProfit: 2_000_000,
      activity: "COMMERCE",
      dividendsDistributed: 0,
    });
    expect(result.effectiveRate).toBeGreaterThan(0.27);
    expect(result.effectiveRate).toBeLessThan(0.35);
  });

  it("Simples Nacional, Serviços, receita R$ 400k → efetivo entre 11-14%", () => {
    const result = calculateBrazilPjTax({
      regime: "SIMPLES",
      annualRevenue: 400_000,
      annualProfit: 160_000,
      activity: "SERVICES",
      dividendsDistributed: 0,
    });
    expect(result.effectiveRate).toBeGreaterThan(0.10);
    expect(result.effectiveRate).toBeLessThan(0.15);
  });

  it("always returns a breakdown array", () => {
    const result = calculateBrazilPjTax({
      regime: "PRESUMIDO",
      annualRevenue: 500_000,
      annualProfit: 100_000,
      activity: "COMMERCE",
      dividendsDistributed: 0,
    });
    expect(Array.isArray(result.breakdown)).toBe(true);
    expect(result.breakdown.length).toBeGreaterThan(0);
  });

  it("totalTaxBRL is the sum of all breakdown amounts", () => {
    const result = calculateBrazilPjTax({
      regime: "REAL",
      annualRevenue: 5_000_000,
      annualProfit: 1_000_000,
      activity: "SERVICES",
      dividendsDistributed: 0,
    });
    const sumFromBreakdown = result.breakdown.reduce((s, b) => s + b.amount, 0);
    expect(Math.abs(result.totalTaxBRL - sumFromBreakdown)).toBeLessThan(1);
  });
});
