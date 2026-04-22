"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, KeyRound } from "lucide-react";

type State = { success: false; error: string } | { success: true; data: unknown } | null;

interface Props {
  action: (fd: FormData) => Promise<State>;
  defaultValues?: {
    name?: string;
    email?: string;
    portalUrl?: string | null;
    responsibleName?: string | null;
    responsiblePhone?: string | null;
    active?: boolean;
    hasCredentials?: boolean;
  };
  submitLabel?: string;
  showActive?: boolean;
}

export function ProviderForm({ action, defaultValues, submitLabel = "Salvar", showActive = false }: Props) {
  const [state, formAction, pending] = useActionState<State, FormData>((_p, fd) => action(fd), null);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" defaultValue={defaultValues?.name} placeholder="Nome do prestador" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" defaultValue={defaultValues?.email} placeholder="contato@prestador.com" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="portalUrl">URL do portal <span className="text-xs text-muted-foreground">(opcional)</span></Label>
          <Input id="portalUrl" name="portalUrl" type="url" defaultValue={defaultValues?.portalUrl ?? ""} placeholder="https://portal.prestador.com" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="responsibleName">Responsável <span className="text-xs text-muted-foreground">(opcional)</span></Label>
          <Input id="responsibleName" name="responsibleName" defaultValue={defaultValues?.responsibleName ?? ""} placeholder="Nome do responsável" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="responsiblePhone">Telefone <span className="text-xs text-muted-foreground">(opcional)</span></Label>
          <Input id="responsiblePhone" name="responsiblePhone" defaultValue={defaultValues?.responsiblePhone ?? ""} placeholder="+55 11 99999-9999" />
        </div>
        {showActive && (
          <div className="flex items-center gap-3 pt-2">
            <Switch name="active" value="true" defaultChecked={defaultValues?.active ?? true} id="active" />
            <Label htmlFor="active">Ativo</Label>
          </div>
        )}
        {!showActive && <input type="hidden" name="active" value="true" />}
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">
            Credenciais de acesso
            {defaultValues?.hasCredentials && (
              <span className="ml-2 text-xs text-muted-foreground">(deixe em branco para manter as atuais)</span>
            )}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="credUsername">Usuário</Label>
            <Input id="credUsername" name="credUsername" autoComplete="off" placeholder="Usuário do portal" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="credPassword">Senha</Label>
            <Input id="credPassword" name="credPassword" type="password" autoComplete="new-password" placeholder="••••••••" />
          </div>
        </div>
      </div>

      {state && !state.success && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>Cancelar</Button>
      </div>
    </form>
  );
}
