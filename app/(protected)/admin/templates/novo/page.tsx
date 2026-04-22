import { prisma } from "@/lib/db";
import { TemplateForm } from "@/components/admin/TemplateForm";
import { createTemplateAction } from "@/app/actions/admin";

export const metadata = { title: "Novo Template — Admin" };

export default async function NovoTemplatePage() {
  const [jurisdictions, providers] = await Promise.all([
    prisma.jurisdiction.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, countryCode: true } }),
    prisma.serviceProvider.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Novo template de obrigação</h1>
      <TemplateForm action={createTemplateAction} jurisdictions={jurisdictions} providers={providers} submitLabel="Criar template" />
    </div>
  );
}
