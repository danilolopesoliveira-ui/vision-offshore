import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { JurisdictionForm } from "@/components/admin/JurisdictionForm";
import { updateJurisdictionAction } from "@/app/actions/admin";

interface Props { params: Promise<{ id: string }> }

export default async function EditarJurisdicaoPage({ params }: Props) {
  const { id } = await params;
  const j = await prisma.jurisdiction.findUnique({ where: { id } });
  if (!j) notFound();

  async function bound(fd: FormData) {
    "use server";
    return updateJurisdictionAction(id, fd);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Editar jurisdição</h1>
        <p className="mt-1 text-sm text-muted-foreground">{j.name}</p>
      </div>
      <JurisdictionForm
        action={bound}
        defaultValues={{ name: j.name, countryCode: j.countryCode, isTaxHaven: j.isTaxHaven, active: j.active }}
        submitLabel="Salvar alterações"
        showActive
      />
    </div>
  );
}
