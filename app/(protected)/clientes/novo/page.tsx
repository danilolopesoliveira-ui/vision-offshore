import { ClientForm } from "@/components/clients/ClientForm";
import { createClientAction } from "@/app/actions/clients";

export const metadata = { title: "Novo Cliente — Vision Offshore" };

export default function NovoClientePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Novo cliente</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preencha os dados do cliente pessoa física.
        </p>
      </div>
      <ClientForm action={createClientAction} submitLabel="Criar cliente" />
    </div>
  );
}
