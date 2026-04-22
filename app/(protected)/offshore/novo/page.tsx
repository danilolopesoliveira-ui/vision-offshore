import { prisma } from "@/lib/db";
import { OffshoreForm } from "@/components/offshore/OffshoreForm";
import { createOffshoreAction } from "@/app/actions/offshore";

export const metadata = { title: "Nova Offshore — Vision Offshore" };

interface PageProps {
  searchParams: Promise<{ clientId?: string }>;
}

export default async function NovaOffshorePage({ searchParams }: PageProps) {
  const { clientId } = await searchParams;

  const [jurisdictions, clients] = await Promise.all([
    prisma.jurisdiction.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, countryCode: true, isTaxHaven: true },
    }),
    prisma.individualClient.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nova offshore</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre uma nova empresa offshore para um cliente.
        </p>
      </div>
      <OffshoreForm
        action={createOffshoreAction}
        jurisdictions={jurisdictions}
        clients={clients}
        defaultValues={clientId ? { individualClientId: clientId } : undefined}
        submitLabel="Criar offshore"
      />
    </div>
  );
}
