import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { InvoiceTable } from "@/components/invoices/InvoiceTable";

export const metadata = { title: "Invoices — Vision Offshore" };

const PAGE_SIZE = 30;

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  const { q = "", page = "1" } = await searchParams;
  const skip = (parseInt(page) - 1) * PAGE_SIZE;

  const where = q
    ? {
        OR: [
          { recipientName: { contains: q, mode: "insensitive" as const } },
          { invoiceNumber: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        invoiceNumber: true,
        recipientName: true,
        total: true,
        currency: true,
        issueDate: true,
        driveUrl: true,
        createdAt: true,
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = parseInt(page);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} invoice{total !== 1 ? "s" : ""} gerada{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/invoices/nova">
            <Plus className="mr-2 h-4 w-4" />
            Nova Invoice
          </Link>
        </Button>
      </div>

      {/* Search */}
      <form method="GET">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Buscar por destinatário ou número…"
          className="max-w-sm"
        />
      </form>

      {/* Table */}
      <InvoiceTable invoices={invoices} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {currentPage > 1 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`?q=${q}&page=${currentPage - 1}`}>Anterior</Link>
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
          {currentPage < totalPages && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`?q=${q}&page=${currentPage + 1}`}>Próxima</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
