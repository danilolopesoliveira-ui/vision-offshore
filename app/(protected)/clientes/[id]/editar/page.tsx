import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { ClientForm } from "@/components/clients/ClientForm";
import { updateClientAction } from "@/app/actions/clients";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const client = await prisma.individualClient.findUnique({ where: { id }, select: { name: true } });
  return { title: client ? `Editar ${client.name} — Vision Offshore` : "Editar cliente" };
}

export default async function EditarClientePage({ params }: Props) {
  const { id } = await params;
  const client = await prisma.individualClient.findUnique({ where: { id } });
  if (!client) notFound();

  async function boundUpdate(formData: FormData) {
    "use server";
    return updateClientAction(id, formData);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Editar cliente</h1>
        <p className="mt-1 text-sm text-muted-foreground">{client.name}</p>
      </div>
      <ClientForm
        action={boundUpdate}
        defaultValues={client}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
