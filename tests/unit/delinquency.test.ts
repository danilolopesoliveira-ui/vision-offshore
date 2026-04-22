import { describe, it, expect } from "vitest";

// Simula a lógica da delinquency_view em TypeScript puro para testes unitários.
// A view real consulta Postgres — aqui validamos as regras de negócio.

interface Obligation {
  id: string;
  status: "PENDING" | "PAID" | "CANCELLED";
  dueDateOriginal: Date;
  dueDateAdjusted: Date | null;
}

function getEffectiveDue(o: Obligation): Date {
  return o.dueDateAdjusted ?? o.dueDateOriginal;
}

function isDelinquent(o: Obligation, today: Date): boolean {
  if (o.status !== "PENDING") return false;
  return getEffectiveDue(o) < today;
}

function getBucket(daysOverdue: number): string {
  if (daysOverdue > 90) return "90+";
  if (daysOverdue > 60) return "61-90";
  if (daysOverdue > 30) return "31-60";
  return "0-30";
}

function computeDaysOverdue(o: Obligation, today: Date): number {
  const due = getEffectiveDue(o);
  return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

const today = new Date("2026-04-21T12:00:00Z");

describe("Delinquency rules", () => {
  it("paid obligation does not appear as delinquent", () => {
    const o: Obligation = {
      id: "1",
      status: "PAID",
      dueDateOriginal: new Date("2026-03-01"),
      dueDateAdjusted: null,
    };
    expect(isDelinquent(o, today)).toBe(false);
  });

  it("cancelled obligation does not appear as delinquent", () => {
    const o: Obligation = {
      id: "2",
      status: "CANCELLED",
      dueDateOriginal: new Date("2026-03-01"),
      dueDateAdjusted: null,
    };
    expect(isDelinquent(o, today)).toBe(false);
  });

  it("pending past-due obligation is delinquent", () => {
    const o: Obligation = {
      id: "3",
      status: "PENDING",
      dueDateOriginal: new Date("2026-03-01"),
      dueDateAdjusted: null,
    };
    expect(isDelinquent(o, today)).toBe(true);
  });

  it("uses adjusted date when present (R1)", () => {
    const o: Obligation = {
      id: "4",
      status: "PENDING",
      dueDateOriginal: new Date("2026-03-01"), // would be overdue
      dueDateAdjusted: new Date("2026-05-01"), // not overdue
    };
    expect(isDelinquent(o, today)).toBe(false);
  });

  it("correctly assigns bucket 0-30", () => {
    expect(getBucket(15)).toBe("0-30");
  });

  it("correctly assigns bucket 31-60", () => {
    expect(getBucket(45)).toBe("31-60");
  });

  it("correctly assigns bucket 61-90", () => {
    expect(getBucket(75)).toBe("61-90");
  });

  it("correctly assigns bucket 90+", () => {
    expect(getBucket(120)).toBe("90+");
  });

  it("pending future obligation is not delinquent", () => {
    const o: Obligation = {
      id: "5",
      status: "PENDING",
      dueDateOriginal: new Date("2026-05-01"),
      dueDateAdjusted: null,
    };
    expect(isDelinquent(o, today)).toBe(false);
  });

  it("days overdue calculation uses adjusted date (R1)", () => {
    const o: Obligation = {
      id: "6",
      status: "PENDING",
      dueDateOriginal: new Date("2026-01-01"),
      dueDateAdjusted: new Date("2026-04-01"),
    };
    const days = computeDaysOverdue(o, today);
    expect(days).toBe(20); // 21 Apr - 1 Apr = 20 days
  });
});
