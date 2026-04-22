import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const metadata = { title: "Clientes PF — Vision Offshore" };

const DOC_LABEL = { CPF: "CPF", CNH: "CNH", PASSPORT: "Passaporte" } as const;

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

const PAGE_SIZE = 20;

export default async function ClientesPage({ searchParams }: PageProps) {
  const { q = "", page = "1" } = await searchParams;
  const skip = (parseInt(page) - 1) * PAGE_SIZE;

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { documentNumber: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [clients, total] = await Promise.all([
    prisma.individualClient.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        documentType: true,
        documentNumber: true,
        totalDeclaredWealthUsd: true,
        createdAt: true,
        _count: { select: { offshores: true } },
      },
    }),
    prisma.individualClient.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = parseInt(page);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes PF</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} cliente{total !== 1 ? "s" : ""} cadastrado{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/clientes/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo cliente
          </Link>
        </Button>
      </div>

      {/* Search */}
      <form method="GET" className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome ou documento..."
          className="pl-9"
        />
      </form>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead className="text-right">Patrimônio (USD)</TableHead>
              <TableHead className="text-center">Offshores</TableHead>
              <TableHead>Cadastrado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  {q ? `Nenhum resultado para "${q}"` : "Nenhum cliente cadastrado."}
                </TableCell>
              </TableRow>
            )}
            {clients.map((c) => (
              <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <Link href={`/clientes/${c.id}`} className="font-medium hover:underline">
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {DOC_LABEL[c.documentType]}
                  </Badge>{" "}
                  <span className="text-sm text-muted-foreground">{c.documentNumber}</span>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {c.totalDeclaredWealthUsd != null
                    ? Number(c.totalDeclaredWealthUsd).toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      })
                    : "—"}
                </TableCell>
                <TableCell className="text-center text-sm">{c._count.offshores}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDistanceToNow(c.createdAt, { addSuffix: true, locale: ptBR })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
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
