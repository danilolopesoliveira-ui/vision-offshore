"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

type State = { success: false; error: string } | { success: true; data: unknown } | null;

interface Props {
  action: (fd: FormData) => Promise<State>;
  jurisdictions: { id: string; name: string; countryCode: string }[];
  providers: { id: string; name: string }[];
  defaultValues?: {
    jurisdictionId?: string;
    nature?: string;
    recurrence?: string;
    serviceProviderId?: string | null;
    invoiceValue?: number | null;
    invoiceCurrency?: string;
    penaltyValue?: number | null;
    penaltyCondition?: string | null;
    anchorMonth?: number | null;
    anchorDay?: number | null;
    active?: boolean;
  };
  submitLabel?: string;
  showActive?: boolean;
}

const RECURRENCES = [
  { value: "ONE_OFF", label: "Único (one-off)" },
  { value: "MONTHLY", label: "Mensal" },
  { value: "QUARTERLY", label: "Trimestral" },
  { value: "SEMIANNUAL", label: "Semestral" },
  { value: "ANNUAL", label: "Anual" },
];

export function TemplateForm({ action, jurisdictions, providers, defaultValues, submitLabel = "Salvar", showActive = false }: Props) {
  const [state, formAction, pending] = useActionState<State, FormData>((_p, fd) => action(fd), null);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="jurisdictionId">Jurisdição</Label>
          <Select name="jurisdictionId" defaultValue={defaultValues?.jurisdictionId}>
            <SelectTrigger id="jurisdictionId"><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {jurisdictions.map((j) => (
                <SelectItem key={j.id} value={j.id}>{j.name} ({j.countryCode})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="recurrence">Recorrência</Label>
          <Select name="recurrence" defaultValue={defaultValues?.recurrence ?? "ANNUAL"}>
            <SelectTrigger id="recurrence"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RECURRENCES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="nature">Natureza</Label>
          <Input id="nature" name="nature" defaultValue={defaultValues?.nature} placeholder="Ex.: Annual Return" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="serviceProviderId">Prestador de serviço <span className="text-xs text-muted-foreground">(opcional)</span></Label>
          <Select name="serviceProviderId" defaultValue={defaultValues?.serviceProviderId ?? ""}>
            <SelectTrigger id="serviceProviderId"><SelectValue placeholder="Nenhum" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Nenhum</SelectItem>
              {providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invoiceCurrency">Moeda</Label>
          <Select name="invoiceCurrency" defaultValue={defaultValues?.invoiceCurrency ?? "USD"}>
            <SelectTrigger id="invoiceCurrency"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="BRL">BRL</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="GBP">GBP</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invoiceValue">Valor da fatura <span className="text-xs text-muted-foreground">(opcional)</span></Label>
          <Input id="invoiceValue" name="invoiceValue" type="number" min="0" step="0.01" defaultValue={defaultValues?.invoiceValue?.toString() ?? ""} placeholder="0.00" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="penaltyValue">Valor da multa <span className="text-xs text-muted-foreground">(opcional)</span></Label>
          <Input id="penaltyValue" name="penaltyValue" type="number" min="0" step="0.01" defaultValue={defaultValues?.penaltyValue?.toString() ?? ""} placeholder="0.00" />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="penaltyCondition">Condição de multa <span className="text-xs text-muted-foreground">(opcional)</span></Label>
          <Input id="penaltyCondition" name="penaltyCondition" defaultValue={defaultValues?.penaltyCondition ?? ""} placeholder="Ex.: após 30 dias de atraso" />
        </div>
      </div>

      <Separator />
      <p className="text-sm font-medium text-muted-foreground">Âncora de vencimento (opcional)</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="anchorMonth">Mês (1–12)</Label>
          <Input id="anchorMonth" name="anchorMonth" type="number" min="1" max="12" defaultValue={defaultValues?.anchorMonth?.toString() ?? ""} placeholder="Ex.: 4 (abril)" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="anchorDay">Dia (1–31)</Label>
          <Input id="anchorDay" name="anchorDay" type="number" min="1" max="31" defaultValue={defaultValues?.anchorDay?.toString() ?? ""} placeholder="Ex.: 30" />
        </div>
      </div>

      {showActive && (
        <div className="flex items-center gap-3">
          <Switch name="active" value="true" defaultChecked={defaultValues?.active ?? true} id="active" />
          <Label htmlFor="active">Ativo</Label>
        </div>
      )}
      {!showActive && <input type="hidden" name="active" value="true" />}

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
