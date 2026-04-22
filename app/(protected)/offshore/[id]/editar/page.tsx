import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { OffshoreForm } from "@/components/offshore/OffshoreForm";
import { updateOffshoreAction } from "@/app/actions/offshore";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const o = await prisma.offshoreCompany.findUnique({ where: { id }, select: { name: true } });
  return { title: o ? `Editar ${o.name} — Vision Offshore` : "Editar offshore" };
}

export default async function EditarOffshorePage({ params }: Props) {
  const { id } = await params;

  const [offshore, jurisdictions, clients] = await Promise.all([
    prisma.offshoreCompany.findUnique({
      where: { id },
      include: { jointTenants: true },
    }),
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

  if (!offshore) notFound();

  async function boundUpdate(formData: FormData) {
    "use server";
    return updateOffshoreAction(id, formData);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Editar offshore</h1>
        <p className="mt-1 text-sm text-muted-foreground">{offshore.name}</p>
      </div>
      <OffshoreForm
        action={boundUpdate}
        jurisdictions={jurisdictions}
        clients={clients}
        defaultValues={{
          individualClientId: offshore.individualClientId,
          name: offshore.name,
          jurisdictionId: offshore.jurisdictionId,
          declaredWealthUsd: offshore.declaredWealthUsd?.toString() ?? null,
          status: offshore.status,
          jointTenancy: offshore.jointTenancy,
          jointTenants: offshore.jointTenants.map((jt) => ({
            name: jt.name,
            documentType: jt.documentType,
            documentNumber: jt.documentNumber,
            percentage: Number(jt.percentage).toString(),
          })),
        }}
        submitLabel="Salvar alterações"
        showStatus
      />
    </div>
  );
}
