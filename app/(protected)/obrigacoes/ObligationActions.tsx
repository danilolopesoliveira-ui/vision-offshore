"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markPaidAction, markCancelledAction } from "@/app/actions/obligations";

export function ObligationActions({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1 justify-end">
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        disabled={isPending}
        onClick={() => startTransition(async () => { await markPaidAction(id); })}
      >
        Pagar
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs text-muted-foreground"
        disabled={isPending}
        onClick={() => startTransition(async () => { await markCancelledAction(id); })}
      >
        Cancelar
      </Button>
    </div>
  );
}
