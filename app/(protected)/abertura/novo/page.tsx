import { prisma } from "@/lib/db";
import { createOpeningProcessAction } from "@/app/actions/opening";
import { NewProcessForm } from "./NewProcessForm";

export const metadata = { title: "Novo Processo de Abertura — Vision Offshore" };

export default async function NovoAberturaPage() {
  const [clients, jurisdictions] = await Promise.all([
    prisma.individualClient.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.jurisdiction.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, countryCode: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Novo processo de abertura</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Inicia o kanban de abertura para uma nova empresa offshore.
        </p>
      </div>
      <NewProcessForm
        action={createOpeningProcessAction}
        clients={clients}
        jurisdictions={jurisdictions}
      />
    </div>
  );
}
