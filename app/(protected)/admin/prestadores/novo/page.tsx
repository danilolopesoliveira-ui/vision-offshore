import { ProviderForm } from "@/components/admin/ProviderForm";
import { createProviderAction } from "@/app/actions/admin";

export const metadata = { title: "Novo Prestador — Admin" };

export default function NovoPrestadorPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Novo prestador de serviço</h1>
      <ProviderForm action={createProviderAction} submitLabel="Criar prestador" />
    </div>
  );
}
