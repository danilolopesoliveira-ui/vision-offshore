import { prisma } from "@/lib/db";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DelinquencyRow {
  obligation_id: string;
  client_name: string;
  offshore_name: string;
  offshore_id: string;
  nature: string;
  effective_due: Date;
  invoice_value: number | null;
  invoice_currency: string | null;
  days_overdue: number;
  bucket: string;
}

const BUCKET_VARIANT: Record<string, "destructive" | "outline" | "secondary"> = {
  "90+":   "destructive",
  "61-90": "destructive",
  "31-60": "outline",
  "0-30":  "secondary",
};

export async function DelinquencyTable() {
  let rows: DelinquencyRow[] = [];
  try {
    rows = await prisma.$queryRaw<DelinquencyRow[]>`
      SELECT * FROM delinquency_view
      ORDER BY days_overdue DESC
      LIMIT 50
    `;
  } catch {
    // View may not exist yet (before first migration)
    rows = [];
  }

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhuma obrigação em inadimplência.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {rows.map((r) => (
        <div key={r.obligation_id} className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              <Link href={`/offshore/${r.offshore_id}`} className="hover:underline">
                {r.offshore_name}
              </Link>
              <span className="mx-1.5 text-muted-foreground">—</span>
              {r.nature}
            </p>
            <p className="text-xs text-muted-foreground">
              {r.client_name} ·{" "}
              {format(new Date(r.effective_due), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="ml-4 flex shrink-0 items-center gap-3">
            {r.invoice_value != null && (
              <span className="font-mono text-xs">
                {Number(r.invoice_value).toLocaleString("en-US", {
                  style: "currency",
                  currency: r.invoice_currency ?? "USD",
                })}
              </span>
            )}
            <Badge variant={BUCKET_VARIANT[r.bucket] ?? "secondary"}>
              {r.days_overdue}d atraso
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
