import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { StageData } from "@/app/actions/opening";

const STAGE_LABELS = ["Etapa 1 — Documentação", "Etapa 2 — Abertura", "Etapa 3 — Assinaturas", "Etapa 4 — Finalização"];
const STAGE_COLORS = [
  "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800",
  "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
];

interface ProcessItem {
  id: string;
  currentStage: number;
  completedAt: Date | null;
  createdAt: Date;
  jurisdictionId: string;
  stage1: StageData;
  stage2: StageData;
  stage3: StageData;
  stage4: StageData;
  individualClient: { name: string };
  jurisdiction: { name: string; countryCode: string };
}

interface Props {
  processes: ProcessItem[];
}

function progressOf(stageData: StageData): number {
  if (!stageData?.items?.length) return 0;
  const done = stageData.items.filter((i) => i.checked).length;
  return Math.round((done / stageData.items.length) * 100);
}

function ProcessCard({ process }: { process: ProcessItem }) {
  const stage1 = process.stage1 as StageData & { companyName?: string };
  const stageKey = `stage${process.currentStage}` as "stage1" | "stage2" | "stage3" | "stage4";
  const progress = progressOf(process[stageKey] as unknown as StageData);

  return (
    <Link href={`/abertura/${process.id}`}>
      <Card className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/30">
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold leading-tight line-clamp-2">
              {stage1.companyName ?? "—"}
            </p>
            {process.completedAt && (
              <Badge variant="default" className="shrink-0 text-[10px]">Concluído</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{process.individualClient.name}</p>
        </CardHeader>
        <CardContent className="pb-3 px-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] font-mono">
              {process.jurisdiction.countryCode}
            </Badge>
            <span className="text-xs text-muted-foreground truncate">
              {process.jurisdiction.name}
            </span>
          </div>
          {/* Progress bar */}
          <div className="space-y-1">
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">{progress}% desta etapa</p>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Criado {format(process.createdAt, "dd/MM/yy", { locale: ptBR })}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export function KanbanBoard({ processes }: Props) {
  const byStage = [1, 2, 3, 4].map((stage) =>
    processes.filter((p) => p.currentStage === stage && !p.completedAt)
  );
  const completed = processes.filter((p) => p.completedAt);

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-[900px]">
        {[0, 1, 2, 3].map((idx) => (
          <div key={idx} className="flex-1 min-w-0 space-y-3">
            {/* Column header */}
            <div className={`rounded-lg border px-3 py-2 ${STAGE_COLORS[idx]}`}>
              <p className="text-xs font-semibold">{STAGE_LABELS[idx]}</p>
              <p className="text-xs opacity-70">{byStage[idx]?.length ?? 0} processo{(byStage[idx]?.length ?? 0) !== 1 ? "s" : ""}</p>
            </div>
            {/* Cards */}
            <div className="space-y-2">
              {(byStage[idx]?.length ?? 0) === 0 && (
                <p className="text-center text-xs text-muted-foreground py-6">Nenhum</p>
              )}
              {(byStage[idx] ?? []).map((p) => (
                <ProcessCard key={p.id} process={p} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <div className="mt-8 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            Concluídos ({completed.length})
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {completed.map((p) => (
              <ProcessCard key={p.id} process={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
