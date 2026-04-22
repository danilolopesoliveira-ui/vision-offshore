"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

type State = { success: false; error: string } | { success: true; data: unknown } | null;

interface DefaultValues {
  name?: string;
  countryCode?: string;
  isTaxHaven?: boolean;
  active?: boolean;
}

interface Props {
  action: (fd: FormData) => Promise<State>;
  defaultValues?: DefaultValues;
  submitLabel?: string;
  showActive?: boolean;
}

export function JurisdictionForm({ action, defaultValues, submitLabel = "Salvar", showActive = false }: Props) {
  const [state, formAction, pending] = useActionState<State, FormData>((_p, fd) => action(fd), null);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" defaultValue={defaultValues?.name} placeholder="Ex.: British Virgin Islands" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="countryCode">Código do país (ISO 3166-1)</Label>
          <Input id="countryCode" name="countryCode" defaultValue={defaultValues?.countryCode} placeholder="VG" maxLength={2} className="uppercase w-24" required />
        </div>
        <div className="flex items-center gap-3 pt-6">
          <Switch name="isTaxHaven" value="true" defaultChecked={defaultValues?.isTaxHaven ?? false} id="isTaxHaven" />
          <Label htmlFor="isTaxHaven">Tax Haven</Label>
        </div>
        {showActive && (
          <div className="flex items-center gap-3">
            <Switch name="active" value="true" defaultChecked={defaultValues?.active ?? true} id="active" />
            <Label htmlFor="active">Ativa</Label>
          </div>
        )}
        {!showActive && <input type="hidden" name="active" value="true" />}
      </div>

      {state && !state.success && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>Cancelar</Button>
      </div>
    </form>
  );
}
