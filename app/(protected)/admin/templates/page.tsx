import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";

export const metadata = { title: "Templates de Obrigação — Admin" };

const RECURRENCE_LABEL: Record<string, string> = {
  ONE_OFF: "Único",
  MONTHLY: "Mensal",
  QUARTERLY: "Trimestral",
  SEMIANNUAL: "Semestral",
  ANNUAL: "Anual",
};

export default async function TemplatesPage() {
  const templates = await prisma.obligationTemplate.findMany({
    orderBy: [{ jurisdiction: { name: "asc" } }, { nature: "asc" }],
    include: {
      jurisdiction: { select: { name: true, countryCode: true } },
      serviceProvider: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Templates de Obrigação</h1>
          <p className="mt-1 text-sm text-muted-foreground">{templates.length} template{templates.length !== 1 ? "s" : ""}</p>
        </div>
        <Button asChild>
          <Link href="/admin/templates/novo">
            <Plus className="mr-2 h-4 w-4" />Novo template
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Natureza</TableHead>
              <TableHead>Jurisdição</TableHead>
              <TableHead>Recorrência</TableHead>
              <TableHead>Prestador</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">Nenhum template cadastrado.</TableCell></TableRow>
            )}
            {templates.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.nature}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {t.jurisdiction.name} ({t.jurisdiction.countryCode})
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{RECURRENCE_LABEL[t.recurrence] ?? t.recurrence}</Badge>
                </TableCell>
                <TableCell className="text-sm">{t.serviceProvider?.name ?? "—"}</TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {t.invoiceValue != null
                    ? `${Number(t.invoiceValue).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${t.invoiceCurrency}`
                    : "—"}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={t.active ? "default" : "secondary"}>{t.active ? "Ativo" : "Inativo"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/templates/${t.id}/editar`}>Editar</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
