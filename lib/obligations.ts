import {
  type PrismaClient,
  type ObligationTemplate,
  type Recurrence,
  ObligationOrigin,
} from "@prisma/client";
// Accepts both the full PrismaClient and Prisma transaction clients
type TxClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
import { addMonths, setDate, setMonth } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { nanoid } from "nanoid";

const TZ = "America/Sao_Paulo";

// Number of months to generate ahead for recurring obligations (R2)
const RECURRENCE_HORIZON_MONTHS = 24;

// How many instances each recurrence type generates in a 24-month window
const RECURRENCE_INSTANCE_COUNT: Record<Recurrence, number> = {
  ONE_OFF: 1,
  MONTHLY: 24,
  QUARTERLY: 8,
  SEMIANNUAL: 4,
  ANNUAL: 2,
};

// Gap in months between instances
const RECURRENCE_INTERVAL_MONTHS: Record<Recurrence, number> = {
  ONE_OFF: 0,
  MONTHLY: 1,
  QUARTERLY: 3,
  SEMIANNUAL: 6,
  ANNUAL: 12,
};

function computeFirstDueDate(template: ObligationTemplate, from: Date): Date {
  const zoned = toZonedTime(from, TZ);
  const month = (template.anchorMonth ?? 1) - 1; // 0-indexed
  const day = template.anchorDay ?? 1;

  let candidate = setDate(setMonth(zoned, month), day);
  // If this date is already past, advance by one interval
  if (candidate <= zoned) {
    const intervalMonths = RECURRENCE_INTERVAL_MONTHS[template.recurrence];
    if (intervalMonths > 0) candidate = addMonths(candidate, intervalMonths);
  }

  return fromZonedTime(candidate, TZ);
}

// Generates instances for a recurrence group starting from `from` date.
// Returns array ready for createMany.
export function buildRecurrenceInstances(
  template: Pick<
    ObligationTemplate,
    | "id"
    | "jurisdictionId"
    | "nature"
    | "recurrence"
    | "serviceProviderId"
    | "invoiceValue"
    | "invoiceCurrency"
    | "anchorMonth"
    | "anchorDay"
  >,
  offshoreId: string,
  from: Date,
  recurrenceGroupId: string
): Array<{
  offshoreId: string;
  templateId: string;
  serviceProviderId: string | null;
  origin: ObligationOrigin;
  nature: string;
  dueDateOriginal: Date;
  invoiceValue: number | null;
  invoiceCurrency: string;
  recurrenceGroupId: string;
}> {
  if (template.recurrence === "ONE_OFF") {
    const dueDate = computeFirstDueDate(template as ObligationTemplate, from);
    return [
      {
        offshoreId,
        templateId: template.id,
        serviceProviderId: template.serviceProviderId ?? null,
        origin: ObligationOrigin.COMPLIANCE_JURISDICTION,
        nature: template.nature,
        dueDateOriginal: dueDate,
        invoiceValue: template.invoiceValue ? Number(template.invoiceValue) : null,
        invoiceCurrency: template.invoiceCurrency,
        recurrenceGroupId,
      },
    ];
  }

  const count = RECURRENCE_INSTANCE_COUNT[template.recurrence];
  const intervalMonths = RECURRENCE_INTERVAL_MONTHS[template.recurrence];
  const firstDue = computeFirstDueDate(template as ObligationTemplate, from);

  return Array.from({ length: count }, (_, i) => ({
    offshoreId,
    templateId: template.id,
    serviceProviderId: template.serviceProviderId ?? null,
    origin: ObligationOrigin.COMPLIANCE_JURISDICTION,
    nature: template.nature,
    dueDateOriginal: addMonths(firstDue, i * intervalMonths),
    invoiceValue: template.invoiceValue ? Number(template.invoiceValue) : null,
    invoiceCurrency: template.invoiceCurrency,
    recurrenceGroupId,
  }));
}

// Called when a new offshore is created: instantiate obligations from all
// active templates of its jurisdiction (R8 — copy, not reference).
export async function instantiateJurisdictionObligations(
  tx: TxClient,
  offshoreId: string,
  jurisdictionId: string,
  createdAt: Date
): Promise<void> {
  const templates = await tx.obligationTemplate.findMany({
    where: { jurisdictionId, active: true },
  });

  for (const tpl of templates) {
    const groupId = nanoid();
    const instances = buildRecurrenceInstances(tpl, offshoreId, createdAt, groupId);
    await tx.obligation.createMany({ data: instances });
  }
}

// Cron helper: extend recurrence groups that have less than HORIZON months ahead (R2)
export async function extendRecurrenceGroup(
  tx: TxClient,
  recurrenceGroupId: string
): Promise<void> {
  const lastObligation = await tx.obligation.findFirst({
    where: {
      recurrenceGroupId,
      status: { notIn: ["PAID", "CANCELLED"] },
    },
    orderBy: { dueDateOriginal: "desc" },
    include: { template: true },
  });

  if (!lastObligation?.template) return;

  const template = lastObligation.template;
  if (template.recurrence === "ONE_OFF") return;

  const horizon = addMonths(new Date(), RECURRENCE_HORIZON_MONTHS);
  if (lastObligation.dueDateOriginal >= horizon) return;

  // Generate instances from the day after the last one
  const nextFrom = addMonths(lastObligation.dueDateOriginal, 1);
  const intervalMonths = RECURRENCE_INTERVAL_MONTHS[template.recurrence];

  const missingInstances: Date[] = [];
  let cursor = lastObligation.dueDateOriginal;
  while (cursor < horizon) {
    cursor = addMonths(cursor, intervalMonths);
    if (cursor < horizon) missingInstances.push(cursor);
  }

  if (missingInstances.length === 0) return;

  await tx.obligation.createMany({
    data: missingInstances.map((dueDate) => ({
      offshoreId: lastObligation.offshoreId,
      templateId: template.id,
      serviceProviderId: lastObligation.serviceProviderId,
      origin: lastObligation.origin,
      nature: lastObligation.nature,
      dueDateOriginal: dueDate,
      invoiceValue: lastObligation.invoiceValue,
      invoiceCurrency: lastObligation.invoiceCurrency,
      recurrenceGroupId,
    })),
    skipDuplicates: true,
  });

  void nextFrom; // suppress unused warning
}
