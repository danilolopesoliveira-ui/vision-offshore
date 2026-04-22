import { describe, it, expect } from "vitest";
import { z } from "zod";

// R7 — Joint Tenants must sum to exactly 100%

const JointTenantSchema = z.object({
  name: z.string().min(3),
  documentType: z.enum(["CPF", "CNH", "PASSPORT"]),
  documentNumber: z.string().min(5),
  percentage: z.number().min(0.01).max(100),
  documentFileId: z.string().optional(),
});

const OffshoreSchema = z
  .object({
    jointTenancy: z.boolean(),
    jointTenants: z.array(JointTenantSchema),
  })
  .refine(
    (data) => {
      if (!data.jointTenancy) return true;
      const sum = data.jointTenants.reduce((s, jt) => s + jt.percentage, 0);
      return Math.abs(sum - 100) < 0.01;
    },
    {
      message: "A soma dos percentuais dos beneficiários deve ser exatamente 100%",
      path: ["jointTenants"],
    }
  );

function makeTenant(percentage: number) {
  return {
    name: "João Silva",
    documentType: "CPF" as const,
    documentNumber: "12345678901",
    percentage,
  };
}

describe("Joint Tenants validation (R7)", () => {
  it("accepts tenants that sum to exactly 100%", () => {
    const result = OffshoreSchema.safeParse({
      jointTenancy: true,
      jointTenants: [makeTenant(60), makeTenant(40)],
    });
    expect(result.success).toBe(true);
  });

  it("rejects tenants that do not sum to 100%", () => {
    const result = OffshoreSchema.safeParse({
      jointTenancy: true,
      jointTenants: [makeTenant(60), makeTenant(30)],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["jointTenants"]).toBeTruthy();
    }
  });

  it("ignores joint tenant percentage when jointTenancy is false", () => {
    const result = OffshoreSchema.safeParse({
      jointTenancy: false,
      jointTenants: [makeTenant(50)], // doesn't sum to 100, but should be ignored
    });
    expect(result.success).toBe(true);
  });

  it("accepts single tenant with 100%", () => {
    const result = OffshoreSchema.safeParse({
      jointTenancy: true,
      jointTenants: [makeTenant(100)],
    });
    expect(result.success).toBe(true);
  });

  it("accepts tenants that sum to 100% within floating-point tolerance (99.99)", () => {
    const result = OffshoreSchema.safeParse({
      jointTenancy: true,
      jointTenants: [makeTenant(33.33), makeTenant(33.33), makeTenant(33.34)],
    });
    expect(result.success).toBe(true);
  });
});
