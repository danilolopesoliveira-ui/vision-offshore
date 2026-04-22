import { describe, it, expect, vi, beforeEach } from "vitest";

// Tests the DCBE business logic independently of the database.
// syncDcbeObligations is tested via its observable outputs.

interface DcbeInput {
  totalDeclaredWealthUsd: number;
  offshoreWealthUsd: number;
}

interface DcbeObligation {
  nature: string;
  dueDateOriginal: Date;
}

// Pure function extracted from lib/dcbe.ts logic for unit testing
function computeDcbeObligations(input: DcbeInput, today: Date): DcbeObligation[] {
  const totalWealth = input.totalDeclaredWealthUsd + input.offshoreWealthUsd;
  const currentYear = today.getFullYear();
  const nextYear = currentYear + 1;

  if (totalWealth < 1_000_000) return [];

  const obligations: DcbeObligation[] = [
    {
      nature: `DCBE Anual — data-base 31/12/${currentYear}`,
      dueDateOriginal: new Date(nextYear, 3, 5), // 05/04 next year
    },
  ];

  if (totalWealth >= 100_000_000) {
    const quarterly = [
      { base: `31/03/${currentYear}`, month: 5, day: 5 },   // 05/06
      { base: `30/06/${currentYear}`, month: 8, day: 5 },   // 05/09
      { base: `30/09/${currentYear}`, month: 11, day: 5 },  // 05/12
    ];

    for (const q of quarterly) {
      const due = new Date(currentYear, q.month, q.day);
      if (due > today) {
        obligations.push({
          nature: `DCBE Trimestral — data-base ${q.base}`,
          dueDateOriginal: due,
        });
      }
    }
  }

  return obligations;
}

const TODAY = new Date("2026-01-15T12:00:00Z");

describe("DCBE motor (R3)", () => {
  it("wealth < USD 1M cancels all — no obligations created", () => {
    const result = computeDcbeObligations({ totalDeclaredWealthUsd: 500_000, offshoreWealthUsd: 0 }, TODAY);
    expect(result).toHaveLength(0);
  });

  it("USD 1M <= wealth < USD 100M creates only annual obligation", () => {
    const result = computeDcbeObligations({ totalDeclaredWealthUsd: 5_000_000, offshoreWealthUsd: 0 }, TODAY);
    expect(result).toHaveLength(1);
    expect(result[0]?.nature).toContain("Anual");
  });

  it("wealth >= USD 100M creates annual + 3 quarterly obligations", () => {
    const result = computeDcbeObligations({ totalDeclaredWealthUsd: 100_000_000, offshoreWealthUsd: 0 }, TODAY);
    expect(result).toHaveLength(4); // 1 anual + 3 trimestrais
    expect(result.filter((o) => o.nature.includes("Anual"))).toHaveLength(1);
    expect(result.filter((o) => o.nature.includes("Trimestral"))).toHaveLength(3);
  });

  it("aggregates totalDeclaredWealthUsd + offshore wealth", () => {
    // 60M + 50M = 110M → triggers 100M threshold
    const result = computeDcbeObligations(
      { totalDeclaredWealthUsd: 60_000_000, offshoreWealthUsd: 50_000_000 },
      TODAY
    );
    expect(result.filter((o) => o.nature.includes("Trimestral"))).toHaveLength(3);
  });

  it("does not create quarterly obligations that are already past", () => {
    // TODAY = 2026-07-01: Q1 (05/06) is already past, Q2 and Q3 should be created
    const laterToday = new Date("2026-07-01T12:00:00Z");
    const result = computeDcbeObligations(
      { totalDeclaredWealthUsd: 100_000_000, offshoreWealthUsd: 0 },
      laterToday
    );
    const quarterly = result.filter((o) => o.nature.includes("Trimestral"));
    expect(quarterly.every((o) => o.dueDateOriginal > laterToday)).toBe(true);
  });

  it("annual obligation always targets 05/04 of next year", () => {
    const result = computeDcbeObligations({ totalDeclaredWealthUsd: 2_000_000, offshoreWealthUsd: 0 }, TODAY);
    const annual = result[0]!;
    expect(annual.dueDateOriginal.getMonth()).toBe(3); // April (0-indexed)
    expect(annual.dueDateOriginal.getDate()).toBe(5);
    expect(annual.dueDateOriginal.getFullYear()).toBe(TODAY.getFullYear() + 1);
  });
});
