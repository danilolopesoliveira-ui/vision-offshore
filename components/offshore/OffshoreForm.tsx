"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { JointTenantManager } from "./JointTenantManager";
import type { DocumentType, OffshoreStatus } from "@prisma/client";

type State = { success: false; error: string } | { success: true; data: unknown } | null;

interface Jurisdiction {
  id: string;
  name: string;
  countryCode: string;
  isTaxHaven: boolean;
}

interface DefaultValues {
  individualClientId?: string;
  name?: string;
  jurisdictionId?: string;
  declaredWealthUsd?: string | number | null;
  status?: OffshoreStatus;
  jointTenancy?: boolean;
  jointTenants?: Array<{
    name: string;
    documentType: DocumentType;
    documentNumber: string;
    percentage: string | number;
  }>;
}

interface Props {
  action: (formData: FormData) => Promise<State>;
  jurisdictions: Jurisdiction[];
  clients: Array<{ id: string; name: string }>;
  defaultValues?: DefaultValues;
  submitLabel?: string;
  showStatus?: boolean;
}

export function OffshoreForm({
  action,
  jurisdictions,
  clients,
  defaultValues,
  submitLabel = "Salvar",
  showStatus = false,
}: Props) {
  const [state, formAction, pending] = useActionState<State, FormData>(
    (_prev, fd) => action(fd),
    null
  );

  const [jointTenancy, setJointTenancy] = useState(defaultValues?.jointTenancy ?? false);

  const initialTenants = (defaultValues?.jointTenants ?? []).map((t) => ({
    name: t.name,
    documentType: t.documentType,
    documentNumber: t.documentNumber,
    percentage: String(t.percentage),
  }));

  return (
    <form action={formAction} className="space-y-8">
      {/* Hidden client id */}
      <input
        type="hidden"
        name="individualClientId"
        value={defaultValues?.individualClientId ?? ""}
      />

      {/* If no individualClientId pre-set, show selector */}
      {!defaultValues?.individualClientId && (
        <div className="space-y-1.5">
          <Label htmlFor="clientSelect">Cliente PF</Label>
          <Select name="individualClientId">
            <SelectTrigger id="clientSelect">
              <SelectValue placeholder="Selecione o cliente..." />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-base font-semibold">Dados da offshore</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="name">Nome da empresa</Label>
            <Input
              id="name"
              name="name"
              defaultValue={defaultValues?.name}
              placeholder="Ex.: Silva Holdings Ltd."
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="jurisdictionId">Jurisdição</Label>
            <Select name="jurisdictionId" defaultValue={defaultValues?.jurisdictionId}>
              <SelectTrigger id="jurisdictionId">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {jurisdictions.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.name} ({j.countryCode}){j.isTaxHaven ? " ★" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="declaredWealthUsd">
              Patrimônio declarado (USD)
              <span className="ml-1 text-xs text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="declaredWealthUsd"
              name="declaredWealthUsd"
              type="number"
              min="0"
              step="0.01"
              defaultValue={defaultValues?.declaredWealthUsd?.toString() ?? ""}
              placeholder="0.00"
            />
          </div>

          {showStatus && (
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={defaultValues?.status ?? "ACTIVE"}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN_OPENING">Em abertura</SelectItem>
                  <SelectItem value="ACTIVE">Ativa</SelectItem>
                  <SelectItem value="SUSPENDED">Suspensa</SelectItem>
                  <SelectItem value="CLOSED">Encerrada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </section>

      <Separator />

      {/* Cotitularidade */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Cotitularidade</h2>
            <p className="text-sm text-muted-foreground">
              Ative se a empresa possui mais de um titular.
            </p>
          </div>
          <Switch
            checked={jointTenancy}
            onCheckedChange={setJointTenancy}
            name="jointTenancy"
            value="true"
          />
          {/* Always submit the field */}
          {!jointTenancy && <input type="hidden" name="jointTenancy" value="false" />}
        </div>

        {jointTenancy && (
          <JointTenantManager initialTenants={initialTenants} />
        )}
      </section>

      {state && !state.success && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
