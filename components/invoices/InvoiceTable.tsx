"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Download, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteInvoiceAction } from "@/app/actions/invoices";

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  recipientName: string;
  total: unknown; // Decimal from Prisma serializes as string
  currency: string;
  issueDate: Date | string;
  driveUrl: string | null;
  createdAt: Date | string;
}

interface Props {
  invoices: InvoiceRow[];
}

export function InvoiceTable({ invoices }: Props) {
  const [, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleDelete(id: string, invoiceNumber: string) {
    if (!confirm(`Excluir invoice ${invoiceNumber}? Esta ação não pode ser desfeita.`)) return;

    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteInvoiceAction(id);
      setDeletingId(null);
      if (result.success) {
        toast.success("Invoice excluída.");
      } else {
        toast.error(result.error);
      }
    });
  }

  if (invoices.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card py-16 text-center">
        <p className="text-muted-foreground text-sm">Nenhuma invoice gerada ainda.</p>
        <p className="text-muted-foreground text-xs mt-1">
          Clique em &quot;Nova Invoice&quot; para começar.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número</TableHead>
            <TableHead>Destinatário</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="w-[120px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell className="font-mono text-xs font-medium">
                {inv.invoiceNumber}
              </TableCell>
              <TableCell>{inv.recipientName}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {format(new Date(inv.issueDate), "dd MMM yyyy", { locale: ptBR })}
              </TableCell>
              <TableCell className="text-right tabular-nums font-medium">
                {inv.currency}{" "}
                {Number(inv.total).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  {/* Download PDF */}
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    title="Baixar PDF"
                  >
                    <Link href={`/api/invoices/${inv.id}/pdf`} target="_blank">
                      <Download className="h-4 w-4" />
                    </Link>
                  </Button>

                  {/* Open in Drive */}
                  {inv.driveUrl && (
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      title="Abrir no Google Drive"
                    >
                      <a href={inv.driveUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    title="Excluir"
                    disabled={deletingId === inv.id}
                    onClick={() => handleDelete(inv.id, inv.invoiceNumber)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
