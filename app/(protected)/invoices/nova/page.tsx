import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = { title: "Nova Invoice — Vision Offshore" };

export default function NovaInvoicePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar para Invoices
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Nova Invoice</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          O PDF será gerado e salvo automaticamente no Google Drive.
        </p>
      </div>

      <InvoiceForm />
    </div>
  );
}
