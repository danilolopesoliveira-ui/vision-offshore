import { type PrismaClient, ObligationOrigin, ObligationStatus } from "@prisma/client";
import { fromZonedTime } from "date-fns-tz";

// R3 — Motor DCBE (Res. BCB 279/2022)
// Triggered when:
//   - OffshoreCompany.declaredWealthUsd changes
//   - IndividualClient.totalDeclaredWealthUsd changes
//   - Cron mensal sync-dcbe
//
// MVP limitation: DCBE is legally a PF obligation but is linked to the oldest
// active offshore. TODO v2: create PfObligation entity.

const TZ = "America/Sao_Paulo";

function brtDate(year: number, month: number, day: number): Date {
  // month is 1-indexed
  return fromZonedTime(new Date(year, month - 1, day, 23, 59, 59), TZ);
}

export async function syncDcbeObligations(clientId: string, tx: PrismaClient): Promise<void> {
  const client = await tx.individualClient.findUniqueOrThrow({
    where: { id: clientId },
    include: {
      offshores: {
        where: { status: { in: ["ACTIVE", "IN_OPENING"] } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const totalWealth =
    (client.totalDeclaredWealthUsd?.toNumber() ?? 0) +
    client.offshores.reduce((sum, o) => sum + (o.declaredWealthUsd?.toNumber() ?? 0), 0);

  const principalOffshore = client.offshores.find((o) => o.status === "ACTIVE");
  if (!principalOffshore) return;

  const today = new Date();
  const currentYear = today.getFullYear();
  const nextYear = currentYear + 1;

  // Cancel all future PENDING DCBE obligations before re-evaluating
  await tx.obligation.updateMany({
    where: {
      offshoreId: principalOffshore.id,
      origin: ObligationOrigin.GENNESYS_DCBE,
      status: ObligationStatus.PENDING,
      dueDateOriginal: { gt: today },
    },
    data: { status: ObligationStatus.CANCELLED },
  });

  // Below USD 1M — nothing to create
  if (totalWealth < 1_000_000) return;

  const obligationsToCreate: Array<{
    offshoreId: string;
    origin: ObligationOrigin;
    nature: string;
    dueDateOriginal: Date;
    invoiceCurrency: string;
  }> = [];

  // Annual DCBE (05/04 of next year, data-base 31/12 current year)
  obligationsToCreate.push({
    offshoreId: principalOffshore.id,
    origin: ObligationOrigin.GENNESYS_DCBE,
    nature: `DCBE Anual — data-base 31/12/${currentYear}`,
    dueDateOriginal: brtDate(nextYear, 4, 5),
    invoiceCurrency: "USD",
  });

  // Quarterly obligations (only if >= USD 100M AND due date is still in the future)
  if (totalWealth >= 100_000_000) {
    const quarterlyDates = [
      { base: `31/03/${currentYear}`, due: brtDate(currentYear, 6, 5) },
      { base: `30/06/${currentYear}`, due: brtDate(currentYear, 9, 5) },
      { base: `30/09/${currentYear}`, due: brtDate(currentYear, 12, 5) },
    ];

    for (const { base, due } of quarterlyDates) {
      if (due > today) {
        obligationsToCreate.push({
          offshoreId: principalOffshore.id,
          origin: ObligationOrigin.GENNESYS_DCBE,
          nature: `DCBE Trimestral — data-base ${base}`,
          dueDateOriginal: due,
          invoiceCurrency: "USD",
        });
      }
    }
  }

  if (obligationsToCreate.length > 0) {
    await tx.obligation.createMany({ data: obligationsToCreate });
  }
}
