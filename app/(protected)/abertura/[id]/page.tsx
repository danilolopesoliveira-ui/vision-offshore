import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StageChecklist } from "@/components/opening/StageChecklist";
import { StageNav } from "./StageNav";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { StageData } from "@/app/actions/opening";
import { ArrowLeft } from "lucide-react";

const STAGE_LABELS = ["Documentação inicial", "Processo de abertura", "Documentos assinados", "Finalização"];

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const p = await prisma.openingProcess.findUnique({
    where: { id },
    select: { stage1: true },
  });
  const name = (p?.stage1 as { companyName?: string })?.companyName;
  return { title: name ? `${name} — Abertura` : "Processo de abertura" };
}

export default async function AberturaDetailPage({ params }: Props) {
  const { id } = await params;

  const process = await prisma.openingProcess.findUnique({
    where: { id },
    include: {
      individualClient: { select: { id: true, name: true } },
    },
  });
  if (!process) notFound();

  const jurisdiction = await prisma.jurisdiction.findUnique({
    where: { id: process.jurisdictionId },
    select: { name: true, countryCode: true },
  });
  const jur = jurisdiction ?? { name: process.jurisdictionId, countryCode: "—" };

  const stage1 = process.stage1 as unknown as StageData & { companyName?: string };
  const stages = [
    { num: 1, data: stage1 },
    { num: 2, data: process.stage2 as unknown as StageData },
    { num: 3, data: process.stage3 as unknown as StageData },
    { num: 4, data: process.stage4 as unknown as StageData },
  ];

  const currentStageData = stages[process.currentStage - 1]?.data;
  const doneItems = currentStageData?.items?.filter((i) => i.checked).length ?? 0;
  const totalItems = currentStageData?.items?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild className="mt-0.5 shrink-0">
          <Link href="/abertura"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight truncate">
              {stage1.companyName ?? "Processo de abertura"}
            </h1>
            {process.completedAt && (
              <Badge variant="default">Concluído</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <Link href={`/clientes/${process.individualClient.id}`} className="hover:underline">
              {process.individualClient.name}
            </Link>
            {" · "}{jur.name} ({jur.countryCode})
          </p>
        </div>
      </div>

      {/* Stage indicator */}
      <div className="flex items-center gap-0">
        {STAGE_LABELS.map((label, idx) => {
          const stageNum = idx + 1;
          const isActive = process.currentStage === stageNum;
          const isDone = process.currentStage > stageNum || !!process.completedAt;
          return (
            <div key={idx} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold border-2 transition-colors ${
                    isDone
                      ? "bg-primary border-primary text-primary-foreground"
                      : isActive
                      ? "border-primary text-primary bg-primary/10"
                      : "border-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? "✓" : stageNum}
                </div>
                <p className="mt-1 hidden text-[10px] text-center text-muted-foreground sm:block max-w-[80px]">
                  {label}
                </p>
              </div>
              {idx < 3 && (
                <div className={`h-0.5 w-full ${isDone ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Stage info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Etapa {process.currentStage} — {STAGE_LABELS[process.currentStage - 1]}
            </CardTitle>
            {totalItems > 0 && (
              <span className="text-sm text-muted-foreground">
                {doneItems}/{totalItems} itens
              </span>
            )}
          </div>
          {/* Progress bar */}
          {totalItems > 0 && (
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.round((doneItems / totalItems) * 100)}%` }}
              />
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Checklist tabs for all stages */}
      <Tabs defaultValue={`stage${process.currentStage}`}>
        <TabsList>
          {stages.map((s) => (
            <TabsTrigger key={s.num} value={`stage${s.num}`}>
              E{s.num}
              {process.currentStage > s.num || process.completedAt ? " ✓" : ""}
            </TabsTrigger>
          ))}
        </TabsList>
        {stages.map((s) => (
          <TabsContent key={s.num} value={`stage${s.num}`} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  {STAGE_LABELS[s.num - 1]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StageChecklist
                  processId={id}
                  stage={s.num as 1 | 2 | 3 | 4}
                  items={s.data?.items ?? []}
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Stage navigation */}
      {!process.completedAt && (
        <StageNav
          processId={id}
          currentStage={process.currentStage}
          doneItems={doneItems}
          totalItems={totalItems}
        />
      )}

      {process.completedAt && (
        <p className="text-center text-sm text-muted-foreground">
          Concluído em {format(process.completedAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      )}
    </div>
  );
}
