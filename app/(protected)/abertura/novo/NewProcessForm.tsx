"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

type State = { success: false; error: string } | { success: true; data: { id: string } } | null;

interface Props {
  action: (fd: FormData) => Promise<State>;
  clients: { id: string; name: string }[];
  jurisdictions: { id: string; name: string; countryCode: string }[];
}

export function NewProcessForm({ action, clients, jurisdictions }: Props) {
  const [state, formAction, pending] = useActionState<State, FormData>(
    (_p, fd) => action(fd),
    null
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="individualClientId">Cliente PF</Label>
        <Select name="individualClientId">
          <SelectTrigger id="individualClientId">
            <SelectValue placeholder="Selecione o cliente..." />
          </SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="jurisdictionId">Jurisdição</Label>
        <Select name="jurisdictionId">
          <SelectTrigger id="jurisdictionId">
            <SelectValue placeholder="Selecione a jurisdição..." />
          </SelectTrigger>
          <SelectContent>
            {jurisdictions.map((j) => (
              <SelectItem key={j.id} value={j.id}>{j.name} ({j.countryCode})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="companyName">Nome pretendido da empresa</Label>
        <Input
          id="companyName"
          name="companyName"
          placeholder="Ex.: Silva Holdings Ltd."
          required
        />
      </div>

      {state && !state.success && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Iniciar processo
        </Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
