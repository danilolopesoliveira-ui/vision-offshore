import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { ObligationAlert } from "@/emails/ObligationAlert";
import { addDays, startOfDay, endOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import React from "react";

const TZ = "America/Sao_Paulo";
const ALERT_BUCKETS = [30, 5, 2, 0] as const;

// R4: Run daily at 08:00 BRT. Sends alerts for obligations due in 30/5/2/0 days.
export async function sendDueAlerts(): Promise<{ sent: number; skipped: number }> {
  const todayBRT = toZonedTime(new Date(), TZ);
  let sent = 0;
  let skipped = 0;

  const recipients = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "OPERATOR"] } },
    select: { email: true },
  });

  if (recipients.length === 0) return { sent, skipped };

  const emails = recipients.map((u) => u.email);

  for (const daysBefore of ALERT_BUCKETS) {
    const targetDate = addDays(todayBRT, daysBefore);
    const start = startOfDay(targetDate);
    const end = endOfDay(targetDate);

    const obligations = await prisma.$queryRaw<
      Array<{
        obligation_id: string;
        client_name: string;
        offshore_name: string;
        nature: string;
        effective_due: Date;
        invoice_value: string | null;
        invoice_currency: string;
      }>
    >`
      SELECT
        o.id AS obligation_id,
        ic.name AS client_name,
        oc.name AS offshore_name,
        o.nature,
        COALESCE(o."dueDateAdjusted", o."dueDateOriginal") AS effective_due,
        o."invoiceValue"::text AS invoice_value,
        o."invoiceCurrency" AS invoice_currency
      FROM "Obligation" o
      JOIN "OffshoreCompany" oc ON oc.id = o."offshoreId"
      JOIN "IndividualClient" ic ON ic.id = oc."individualClientId"
      WHERE o.status = 'PENDING'
        AND COALESCE(o."dueDateAdjusted", o."dueDateOriginal") BETWEEN ${start} AND ${end}
    `;

    for (const ob of obligations) {
      // Deduplication check
      const alreadySent = await prisma.alertLog.findUnique({
        where: {
          obligationId_daysBefore: {
            obligationId: ob.obligation_id,
            daysBefore,
          },
        },
      });

      if (alreadySent) {
        skipped++;
        continue;
      }

      try {
        await sendEmail({
          to: emails,
          subject: daysBefore === 0
            ? `[Vision Offshore] Obrigação vence HOJE — ${ob.offshore_name}`
            : `[Vision Offshore] Obrigação vence em ${daysBefore} dias — ${ob.offshore_name}`,
          react: React.createElement(ObligationAlert, {
            clientName: ob.client_name,
            offshoreName: ob.offshore_name,
            nature: ob.nature,
            effectiveDue: ob.effective_due,
            invoiceValue: ob.invoice_value ? parseFloat(ob.invoice_value) : null,
            invoiceCurrency: ob.invoice_currency,
            daysBefore: daysBefore,
          }),
        });

        await prisma.alertLog.create({
          data: { obligationId: ob.obligation_id, daysBefore },
        });

        sent++;
      } catch (err) {
        console.error("[alerts] Failed to send alert for obligation:", ob.obligation_id, err);
      }
    }
  }

  return { sent, skipped };
}
