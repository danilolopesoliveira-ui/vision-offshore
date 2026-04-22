import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { ProviderForm } from "@/components/admin/ProviderForm";
import { updateProviderAction } from "@/app/actions/admin";

interface Props { params: Promise<{ id: string }> }

export default async function EditarPrestadorPage({ params }: Props) {
  const { id } = await params;
  const p = await prisma.serviceProvider.findUnique({
    where: { id },
    include: { credential: { select: { updatedAt: true } } },
  });
  if (!p) notFound();

  async function bound(fd: FormData) {
    "use server";
    return updateProviderAction(id, fd);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Editar prestador</h1>
        <p className="mt-1 text-sm text-muted-foreground">{p.name}</p>
      </div>
      <ProviderForm
        action={bound}
        defaultValues={{
          name: p.name,
          email: p.email,
          portalUrl: p.portalUrl,
          responsibleName: p.responsibleName,
          responsiblePhone: p.responsiblePhone,
          active: p.active,
          hasCredentials: !!p.credential,
        }}
        submitLabel="Salvar alterações"
        showActive
      />
    </div>
  );
}
