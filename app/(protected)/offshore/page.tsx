import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search } from "lucide-react";

export const metadata = { title: "Offshore — Vision Offshore" };

const STATUS_LABEL = {
  IN_OPENING: "Em abertura",
  ACTIVE: "Ativa",
  SUSPENDED: "Suspensa",
  CLOSED: "Encerrada",
} as const;

const STATUS_VARIANT = {
  IN_OPENING: "secondary",
  ACTIVE: "default",
  SUSPENDED: "outline",
  CLOSED: "destructive",
} as const;

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

const PAGE_SIZE = 20;

export default async function OffshorePage({ searchParams }: PageProps) {
  const { q = "", page = "1" } = await searchParams;
  const skip = (parseInt(page) - 1) * PAGE_SIZE;

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { individualClient: { name: { contains: q, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const [offshores, total] = await Promise.all([
    prisma.offshoreCompany.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        status: true,
        declaredWealthUsd: true,
        jointTenancy: true,
        individualClient: { select: { id: true, name: true } },
        jurisdiction: { select: { name: true, countryCode: true } },
        _count: { select: { obligations: true } },
      },
    }),
    prisma.offshoreCompany.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = parseInt(page);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Offshore</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} empresa{total !== 1 ? "s" : ""} cadastrada{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/offshore/novo">
            <Plus className="mr-2 h-4 w-4" />
            Nova offshore
          </Link>
        </Button>
      </div>

      <form method="GET" className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={q}
          placeholder="Buscar por empresa ou cliente..."
          className="pl-9"
        />
      </form>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Jurisdição</TableHead>
              <TableHead className="text-right">Patrimônio (USD)</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Obrigações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {offshores.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  {q ? `Nenhum resultado para "${q}"` : "Nenhuma empresa cadastrada."}
                </TableCell>
              </TableRow>
            )}
            {offshores.map((o) => (
              <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <Link href={`/offshore/${o.id}`} className="font-medium hover:underline">
                    {o.name}
                  </Link>
                  {o.jointTenancy && (
                    <Badge variant="outline" className="ml-2 text-[10px]">
                      Cotitular
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/clientes/${o.individualClient.id}`}
                    className="text-sm text-muted-foreground hover:underline"
                  >
                    {o.individualClient.name}
                  </Link>
                </TableCell>
                <TableCell className="text-sm">
                  {o.jurisdiction.name}{" "}
                  <span className="text-muted-foreground">({o.jurisdiction.countryCode})</span>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {o.declaredWealthUsd != null
                    ? Number(o.declaredWealthUsd).toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      })
                    : "—"}
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant={STATUS_VARIANT[o.status] as "default" | "secondary" | "outline" | "destructive"}
                  >
                    {STATUS_LABEL[o.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-center text-sm">{o._count.obligations}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`?q=${q}&page=${currentPage - 1}`}>Anterior</Link>
              </Button>
            )}
            {currentPage < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`?q=${q}&page=${currentPage + 1}`}>Próxima</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
