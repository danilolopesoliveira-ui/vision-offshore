import { JurisdictionForm } from "@/components/admin/JurisdictionForm";
import { createJurisdictionAction } from "@/app/actions/admin";

export const metadata = { title: "Nova Jurisdição — Admin" };

export default function NovaJurisdicaoPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nova jurisdição</h1>
      </div>
      <JurisdictionForm action={createJurisdictionAction} submitLabel="Criar jurisdição" />
    </div>
  );
}
