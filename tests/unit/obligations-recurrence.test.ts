import { describe, it, expect } from "vitest";
import { buildRecurrenceInstances } from "@/lib/obligations";
import { ObligationOrigin } from "@prisma/client";

function makeTemplate(recurrence: "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "ANNUAL") {
  return {
    id: "tpl-1",
    jurisdictionId: "jur-1",
    nature: "Taxa de manutenção",
    recurrence,
    serviceProviderId: null,
    invoiceValue: null,
    invoiceCurrency: "USD",
    anchorMonth: 1,
    anchorDay: 31,
  };
}

const FROM = new Date("2026-01-01T00:00:00Z");
const OFFSHORE_ID = "offshore-1";
const GROUP_ID = "group-1";

describe("Obligation recurrence generation (R2)", () => {
  it("MONTHLY generates 24 instances", () => {
    const instances = buildRecurrenceInstances(
      makeTemplate("MONTHLY"),
      OFFSHORE_ID,
      FROM,
      GROUP_ID
    );
    expect(instances).toHaveLength(24);
  });

  it("QUARTERLY generates 8 instances", () => {
    const instances = buildRecurrenceInstances(
      makeTemplate("QUARTERLY"),
      OFFSHORE_ID,
      FROM,
      GROUP_ID
    );
    expect(instances).toHaveLength(8);
  });

  it("ANNUAL generates 2 instances", () => {
    const instances = buildRecurrenceInstances(
      makeTemplate("ANNUAL"),
      OFFSHORE_ID,
      FROM,
      GROUP_ID
    );
    expect(instances).toHaveLength(2);
  });

  it("all instances share the same recurrenceGroupId", () => {
    const instances = buildRecurrenceInstances(
      makeTemplate("MONTHLY"),
      OFFSHORE_ID,
      FROM,
      GROUP_ID
    );
    expect(instances.every((i) => i.recurrenceGroupId === GROUP_ID)).toBe(true);
  });

  it("all instances are linked to the correct offshore", () => {
    const instances = buildRecurrenceInstances(
      makeTemplate("QUARTERLY"),
      OFFSHORE_ID,
      FROM,
      GROUP_ID
    );
    expect(instances.every((i) => i.offshoreId === OFFSHORE_ID)).toBe(true);
  });

  it("instances are chronologically ordered", () => {
    const instances = buildRecurrenceInstances(
      makeTemplate("MONTHLY"),
      OFFSHORE_ID,
      FROM,
      GROUP_ID
    );
    for (let i = 1; i < instances.length; i++) {
      expect(instances[i]!.dueDateOriginal.getTime()).toBeGreaterThan(
        instances[i - 1]!.dueDateOriginal.getTime()
      );
    }
  });

  it("QUARTERLY instances are 3 months apart", () => {
    const instances = buildRecurrenceInstances(
      makeTemplate("QUARTERLY"),
      OFFSHORE_ID,
      FROM,
      GROUP_ID
    );
    for (let i = 1; i < instances.length; i++) {
      const prev = instances[i - 1]!.dueDateOriginal;
      const curr = instances[i]!.dueDateOriginal;
      const monthDiff =
        (curr.getFullYear() - prev.getFullYear()) * 12 +
        (curr.getMonth() - prev.getMonth());
      expect(monthDiff).toBe(3);
    }
  });

  it("all instances have COMPLIANCE_JURISDICTION origin", () => {
    const instances = buildRecurrenceInstances(
      makeTemplate("ANNUAL"),
      OFFSHORE_ID,
      FROM,
      GROUP_ID
    );
    expect(instances.every((i) => i.origin === ObligationOrigin.COMPLIANCE_JURISDICTION)).toBe(true);
  });
});
