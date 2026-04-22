import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/opening/KanbanBoard";
import { Plus } from "lucide-react";

export const metadata = { title: "Abertura de Empresas — Vision Offshore" };

export default async function AberturaPage() {
  const processes = await prisma.openingProcess.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      individualClient: { select: { name: true } },
    },
  });

  const jurisdictionIds = [...new Set(processes.map((p) => p.jurisdictionId))];
  const jurisdictions = await prisma.jurisdiction.findMany({
    where: { id: { in: jurisdictionIds } },
    select: { id: true, name: true, countryCode: true },
  });
  const jurMap = Object.fromEntries(jurisdictions.map((j) => [j.id, j]));

  const items = processes.map((p) => ({
    ...p,
    stage1: p.stage1 as never,
    stage2: p.stage2 as never,
    stage3: p.stage3 as never,
    stage4: p.stage4 as never,
    jurisdiction: jurMap[p.jurisdictionId] ?? { name: p.jurisdictionId, countryCode: "—" },
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kanban de Abertura</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {processes.length} processo{processes.length !== 1 ? "s" : ""} em andamento
          </p>
        </div>
        <Button asChild>
          <Link href="/abertura/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo processo
          </Link>
        </Button>
      </div>

      <KanbanBoard processes={items} />
    </div>
  );
}
