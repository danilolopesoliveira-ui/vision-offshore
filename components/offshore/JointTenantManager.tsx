"use client";

import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Trash2, UserPlus } from "lucide-react";
import { DocumentType } from "@prisma/client";

interface Tenant {
  name: string;
  documentType: DocumentType;
  documentNumber: string;
  percentage: string;
}

interface Props {
  initialTenants?: Tenant[];
}

const DOC_LABEL: Record<DocumentType, string> = {
  CPF: "CPF",
  CNH: "CNH",
  PASSPORT: "Passaporte",
};

export function JointTenantManager({ initialTenants = [] }: Props) {
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [draft, setDraft] = useState<Tenant>({
    name: "",
    documentType: "CPF",
    documentNumber: "",
    percentage: "",
  });

  const sum = tenants.reduce((acc, t) => acc + parseFloat(t.percentage || "0"), 0);
  const sumOk = Math.abs(sum - 100) < 0.01;

  function addTenant() {
    if (!draft.name || !draft.documentNumber || !draft.percentage) return;
    setTenants((prev) => [...prev, { ...draft }]);
    setDraft({ name: "", documentType: "CPF", documentNumber: "", percentage: "" });
  }

  function removeTenant(i: number) {
    setTenants((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-4">
      {/* Hidden inputs for form submission */}
      <input type="hidden" name="jointTenantCount" value={tenants.length} />
      {tenants.map((t, i) => (
        <span key={i}>
          <input type="hidden" name={`jt_name_${i}`} value={t.name} />
          <input type="hidden" name={`jt_documentType_${i}`} value={t.documentType} />
          <input type="hidden" name={`jt_documentNumber_${i}`} value={t.documentNumber} />
          <input type="hidden" name={`jt_percentage_${i}`} value={t.percentage} />
        </span>
      ))}

      {/* Tenant list */}
      {tenants.length > 0 && (
        <div className="space-y-2">
          {tenants.map((t, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  {DOC_LABEL[t.documentType]} {t.documentNumber}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <Badge variant="secondary">{t.percentage}%</Badge>
                <button
                  type="button"
                  onClick={() => removeTenant(i)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Sum indicator */}
          <p className={`text-sm font-medium ${sumOk ? "text-primary" : "text-destructive"}`}>
            Soma: {sum.toFixed(2)}%{" "}
            {sumOk ? "✓" : `— faltam ${(100 - sum).toFixed(2)}%`}
          </p>
        </div>
      )}

      {/* Add tenant form */}
      <div className="rounded-lg border border-dashed border-border p-3 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Adicionar cotitular
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-xs">Nome</Label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Nome completo"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Documento</Label>
            <Select
              value={draft.documentType}
              onValueChange={(v) => setDraft((d) => ({ ...d, documentType: v as DocumentType }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CPF">CPF</SelectItem>
                <SelectItem value="CNH">CNH</SelectItem>
                <SelectItem value="PASSPORT">Passaporte</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Número</Label>
            <Input
              value={draft.documentNumber}
              onChange={(e) => setDraft((d) => ({ ...d, documentNumber: e.target.value }))}
              placeholder="000.000.000-00"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Percentual (%)</Label>
            <Input
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              value={draft.percentage}
              onChange={(e) => setDraft((d) => ({ ...d, percentage: e.target.value }))}
              placeholder="50.00"
            />
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addTenant}
          disabled={!draft.name || !draft.documentNumber || !draft.percentage}
        >
          <UserPlus className="mr-2 h-3.5 w-3.5" />
          Adicionar
        </Button>
      </div>
    </div>
  );
}
