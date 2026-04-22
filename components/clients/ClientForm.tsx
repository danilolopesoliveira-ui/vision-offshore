"use client";

import { useActionState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import type { IndividualClient } from "@prisma/client";
import type { Address } from "@/types/address";

type State = { success: false; error: string } | { success: true; data: unknown } | null;

interface Props {
  action: (formData: FormData) => Promise<State>;
  defaultValues?: Partial<IndividualClient>;
  submitLabel?: string;
}

export function ClientForm({ action, defaultValues, submitLabel = "Salvar" }: Props) {
  const [state, formAction, pending] = useActionState<State, FormData>(
    (_prev, fd) => action(fd),
    null
  );

  const addr = defaultValues?.address as Address | undefined;

  return (
    <form action={formAction} className="space-y-8">
      {/* Identificação */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold">Identificação</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="name">Nome completo</Label>
            <Input
              id="name"
              name="name"
              defaultValue={defaultValues?.name}
              placeholder="Ex.: João da Silva"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="documentType">Tipo de documento</Label>
            <Select name="documentType" defaultValue={defaultValues?.documentType ?? "CPF"}>
              <SelectTrigger id="documentType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CPF">CPF</SelectItem>
                <SelectItem value="CNH">CNH</SelectItem>
                <SelectItem value="PASSPORT">Passaporte</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="documentNumber">Número do documento</Label>
            <Input
              id="documentNumber"
              name="documentNumber"
              defaultValue={defaultValues?.documentNumber}
              placeholder="000.000.000-00"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="totalDeclaredWealthUsd">
              Patrimônio declarado (USD)
              <span className="ml-1 text-xs text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="totalDeclaredWealthUsd"
              name="totalDeclaredWealthUsd"
              type="number"
              min="0"
              step="0.01"
              defaultValue={defaultValues?.totalDeclaredWealthUsd?.toString()}
              placeholder="0.00"
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* Endereço */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold">Endereço</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="logradouro">Logradouro</Label>
            <Input
              id="logradouro"
              name="logradouro"
              defaultValue={addr?.logradouro}
              placeholder="Rua, Avenida..."
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="numero">Número</Label>
            <Input
              id="numero"
              name="numero"
              defaultValue={addr?.numero}
              placeholder="123"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="complemento">
              Complemento
              <span className="ml-1 text-xs text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="complemento"
              name="complemento"
              defaultValue={addr?.complemento}
              placeholder="Apto 4B"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bairro">Bairro</Label>
            <Input
              id="bairro"
              name="bairro"
              defaultValue={addr?.bairro}
              placeholder="Centro"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cep">CEP</Label>
            <Input
              id="cep"
              name="cep"
              defaultValue={addr?.cep}
              placeholder="00000-000"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cidade">Cidade</Label>
            <Input
              id="cidade"
              name="cidade"
              defaultValue={addr?.cidade}
              placeholder="São Paulo"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="estado">Estado (UF)</Label>
            <Input
              id="estado"
              name="estado"
              defaultValue={addr?.estado}
              placeholder="SP"
              maxLength={2}
              className="uppercase"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pais">País</Label>
            <Input
              id="pais"
              name="pais"
              defaultValue={addr?.pais ?? "Brasil"}
              placeholder="Brasil"
              required
            />
          </div>
        </div>
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
