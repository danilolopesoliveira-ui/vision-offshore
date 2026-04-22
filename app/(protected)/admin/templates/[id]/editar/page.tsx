import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { TemplateForm } from "@/components/admin/TemplateForm";
import { updateTemplateAction } from "@/app/actions/admin";

interface Props { params: Promise<{ id: string }> }

export default async function EditarTemplatePage({ params }: Props) {
  const { id } = await params;
  const [t, jurisdictions, providers] = await Promise.all([
    prisma.obligationTemplate.findUnique({ where: { id } }),
    prisma.jurisdiction.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, countryCode: true } }),
    prisma.serviceProvider.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!t) notFound();

  async function bound(fd: FormData) {
    "use server";
    return updateTemplateAction(id, fd);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Editar template</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.nature}</p>
      </div>
      <TemplateForm
        action={bound}
        jurisdictions={jurisdictions}
        providers={providers}
        defaultValues={{
          jurisdictionId: t.jurisdictionId,
          nature: t.nature,
          recurrence: t.recurrence,
          serviceProviderId: t.serviceProviderId,
          invoiceValue: t.invoiceValue ? Number(t.invoiceValue) : null,
          invoiceCurrency: t.invoiceCurrency,
          penaltyValue: t.penaltyValue ? Number(t.penaltyValue) : null,
          penaltyCondition: t.penaltyCondition,
          anchorMonth: t.anchorMonth,
          anchorDay: t.anchorDay,
          active: t.active,
        }}
        submitLabel="Salvar alterações"
        showActive
      />
    </div>
  );
}
