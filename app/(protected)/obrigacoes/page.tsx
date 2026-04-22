import { prisma } from "@/lib/db";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ObligationActions } from "./ObligationActions";

export const metadata = { title: "Obrigações — Vision Offshore" };

const STATUS_LABEL = { PENDING: "Pendente", PAID: "Paga", CANCELLED: "Cancelada" } as const;
const STATUS_VARIANT = {
  PENDING: "secondary",
  PAID: "default",
  CANCELLED: "outline",
} as const;

const PAGE_SIZE = 30;

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}

export default async function ObrigacoesPage({ searchParams }: PageProps) {
  const { q = "", status = "", page = "1" } = await searchParams;
  const skip = (parseInt(page) - 1) * PAGE_SIZE;

  const where = {
    ...(status ? { status: status as "PENDING" | "PAID" | "CANCELLED" } : {}),
    ...(q
      ? {
          OR: [
            { nature: { contains: q, mode: "insensitive" as const } },
            { offshore: { name: { contains: q, mode: "insensitive" as const } } },
            { offshore: { individualClient: { name: { contains: q, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
  };

  const [obligations, total] = await Promise.all([
    prisma.obligation.findMany({
      where,
      orderBy: [
        { status: "asc" },
        { dueDateOriginal: "asc" },
      ],
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        nature: true,
        status: true,
        origin: true,
        dueDateOriginal: true,
        dueDateAdjusted: true,
        invoiceValue: true,
        invoiceCurrency: true,
        paidAt: true,
        offshore: {
          select: {
            id: true,
            name: true,
            individualClient: { select: { name: true } },
          },
        },
      },
    }),
    prisma.obligation.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = parseInt(page);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Obrigações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} obrigaç{total !== 1 ? "ões" : "ão"}
        </p>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3">
        <div className="relative">
          <Input name="q" defaultValue={q} placeholder="Buscar por natureza, empresa ou cliente..." className="w-72" />
        </div>
        <Select name="status" defaultValue={status || "all"}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="PENDING">Pendente</SelectItem>
            <SelectItem value="PAID">Paga</SelectItem>
            <SelectItem value="CANCELLED">Cancelada</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" variant="outline" size="sm">Filtrar</Button>
      </form>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Natureza</TableHead>
              <TableHead>Offshore / Cliente</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {obligations.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  Nenhuma obrigação encontrada.
                </TableCell>
              </TableRow>
            )}
            {obligations.map((ob) => {
              const due = ob.dueDateAdjusted ?? ob.dueDateOriginal;
              const isOverdue = ob.status === "PENDING" && due < new Date();
              return (
                <TableRow key={ob.id}>
                  <TableCell>
                    <p className="text-sm font-medium">{ob.nature}</p>
                    <Badge variant="outline" className="text-[10px] mt-0.5">{ob.origin}</Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/offshore/${ob.offshore.id}`} className="text-sm font-medium hover:underline">
                      {ob.offshore.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{ob.offshore.individualClient.name}</p>
                  </TableCell>
                  <TableCell>
                    <span className={`text-sm ${isOverdue ? "text-destructive font-semibold" : ""}`}>
                      {format(due, "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                    {ob.dueDateAdjusted && (
                      <p className="text-[10px] text-muted-foreground">ajustado</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {ob.invoiceValue != null
                      ? Number(ob.invoiceValue).toLocaleString("en-US", {
                          style: "currency",
                          currency: ob.invoiceCurrency,
                        })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={STATUS_VARIANT[ob.status] as "default" | "secondary" | "outline"}>
                      {STATUS_LABEL[ob.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {ob.status === "PENDING" && <ObligationActions id={ob.id} />}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Página {currentPage} de {totalPages}</span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`?q=${q}&status=${status}&page=${currentPage - 1}`}>Anterior</Link>
              </Button>
            )}
            {currentPage < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`?q=${q}&status=${status}&page=${currentPage + 1}`}>Próxima</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
