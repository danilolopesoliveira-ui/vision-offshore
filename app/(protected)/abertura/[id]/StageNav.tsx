"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { advanceStageAction, retreatStageAction, completeOpeningAction } from "@/app/actions/opening";
import { ChevronLeft, ChevronRight, CheckCircle, Loader2 } from "lucide-react";

interface Props {
  processId: string;
  currentStage: number;
  doneItems: number;
  totalItems: number;
}

export function StageNav({ processId, currentStage, doneItems, totalItems }: Props) {
  const [isPending, startTransition] = useTransition();
  const allDone = totalItems === 0 || doneItems === totalItems;

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
      <Button
        variant="outline"
        size="sm"
        disabled={isPending || currentStage <= 1}
        onClick={() => startTransition(async () => { await retreatStageAction(processId); })}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronLeft className="mr-1 h-4 w-4" />}
        Voltar etapa
      </Button>

      <p className="text-sm text-muted-foreground">Etapa {currentStage} de 4</p>

      {currentStage < 4 ? (
        <Button
          size="sm"
          disabled={isPending || !allDone}
          onClick={() => startTransition(async () => { await advanceStageAction(processId); })}
          title={!allDone ? "Conclua todos os itens da etapa antes de avançar" : undefined}
        >
          Avançar etapa
          {isPending ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <ChevronRight className="ml-1 h-4 w-4" />}
        </Button>
      ) : (
        <Button
          size="sm"
          disabled={isPending || !allDone}
          onClick={() => startTransition(async () => { await completeOpeningAction(processId); })}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Concluir processo
        </Button>
      )}
    </div>
  );
}
