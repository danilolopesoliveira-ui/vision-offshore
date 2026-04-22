"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { markPaidAction, markCancelledAction } from "@/app/actions/obligations";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  PAID: "Paga",
  CANCELLED: "Cancelada",
};
const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  PENDING: "secondary",
  PAID: "default",
  CANCELLED: "outline",
};

export interface ObligationEvent {
  id: string;
  title: string;
  start: string;
  extendedProps: {
    status: string;
    offshoreName: string;
    nature: string;
    invoiceValue?: number | null;
    invoiceCurrency?: string;
  };
}

interface Props {
  event: ObligationEvent | null;
  onClose: () => void;
  onMutate: () => void;
}

export function ObligationDrawer({ event, onClose, onMutate }: Props) {
  const [isPending, startTransition] = useTransition();

  if (!event) return null;

  const { extendedProps } = event;
  const isPaid = extendedProps.status === "PAID";
  const isCancelled = extendedProps.status === "CANCELLED";

  function handlePaid() {
    startTransition(async () => {
      await markPaidAction(event!.id);
      onMutate();
      onClose();
    });
  }

  function handleCancelled() {
    startTransition(async () => {
      await markCancelledAction(event!.id);
      onMutate();
      onClose();
    });
  }

  return (
    <Sheet open={!!event} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="pr-6">{extendedProps.nature}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[extendedProps.status]}>
              {STATUS_LABEL[extendedProps.status] ?? extendedProps.status}
            </Badge>
          </div>

          <dl className="space-y-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Empresa offshore
              </dt>
              <dd className="mt-1 text-sm font-medium">{extendedProps.offshoreName}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Vencimento
              </dt>
              <dd className="mt-1 text-sm">
                {format(new Date(event.start + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", {
                  locale: ptBR,
                })}
              </dd>
            </div>
            {extendedProps.invoiceValue != null && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Valor da fatura
                </dt>
                <dd className="mt-1 font-mono text-sm font-semibold">
                  {Number(extendedProps.invoiceValue).toLocaleString("en-US", {
                    style: "currency",
                    currency: extendedProps.invoiceCurrency ?? "USD",
                  })}
                </dd>
              </div>
            )}
          </dl>

          {!isPaid && !isCancelled && (
            <>
              <Separator />
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  disabled={isPending}
                  onClick={handlePaid}
                >
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Marcar como paga
                </Button>
                <Button
                  variant="outline"
                  disabled={isPending}
                  onClick={handleCancelled}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
