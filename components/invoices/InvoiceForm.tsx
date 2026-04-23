"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Trash2, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createInvoiceAction, buildInvoiceNumber } from "@/app/actions/invoices";
import { format } from "date-fns";

const ItemSchema = z.object({
  description: z.string().min(1, "Descrição obrigatória"),
  amount: z.number(),
});

const FormSchema = z.object({
  recipientName: z.string().min(1, "Nome obrigatório"),
  recipientAddress: z.string().min(1, "Endereço obrigatório"),
  issueDate: z.string().min(1, "Data obrigatória"),
  currency: z.string(),
  items: z.array(ItemSchema).min(1, "Adicione ao menos um item"),
});

type FormValues = z.infer<typeof FormSchema>;

export function InvoiceForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [invoicePreview, setInvoicePreview] = useState("");

  const today = format(new Date(), "yyyy-MM-dd");

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      recipientName: "",
      recipientAddress: "",
      issueDate: today,
      currency: "USD",
      items: [{ description: "", amount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchedName = watch("recipientName");
  const watchedDate = watch("issueDate");
  const watchedItems = watch("items");

  const total = watchedItems?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) ?? 0;

  // Live preview of invoice number
  useEffect(() => {
    if (watchedName && watchedDate && total > 0) {
      try {
        const num = buildInvoiceNumber(watchedName, total, new Date(watchedDate));
        setInvoicePreview(num);
      } catch {
        setInvoicePreview("");
      }
    } else {
      setInvoicePreview("");
    }
  }, [watchedName, watchedDate, total]);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const result = await createInvoiceAction(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(`Invoice ${result.data.invoiceNumber} criada com sucesso!`);

      // Trigger download
      const link = document.createElement("a");
      link.href = `/api/invoices/${result.data.id}/pdf`;
      link.download = `${result.data.invoiceNumber}.pdf`;
      link.click();

      router.push("/invoices");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Recipient */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Destinatário
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="recipientName">Nome da empresa</Label>
            <Input
              id="recipientName"
              placeholder="Ex: Salopia Consultants Limited"
              {...register("recipientName")}
            />
            {errors.recipientName && (
              <p className="text-xs text-destructive">{errors.recipientName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="issueDate">Data da invoice</Label>
            <Input id="issueDate" type="date" {...register("issueDate")} />
            {errors.issueDate && (
              <p className="text-xs text-destructive">{errors.issueDate.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="recipientAddress">Endereço completo</Label>
          <Textarea
            id="recipientAddress"
            rows={3}
            placeholder={"Trident Chambers, P.O. Box 146\nRoad Town, Tortola\nBritish Virgin Islands"}
            {...register("recipientAddress")}
          />
          {errors.recipientAddress && (
            <p className="text-xs text-destructive">{errors.recipientAddress.message}</p>
          )}
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Itens da invoice
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ description: "", amount: 0 })}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Adicionar item
          </Button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-3 items-start">
              <div className="flex-1 space-y-1">
                <Input
                  placeholder="Descrição do item"
                  {...register(`items.${index}.description`)}
                />
                {errors.items?.[index]?.description && (
                  <p className="text-xs text-destructive">
                    {errors.items[index]?.description?.message}
                  </p>
                )}
              </div>
              <div className="w-36 space-y-1">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register(`items.${index}.amount`, { valueAsNumber: true })}
                />
                {errors.items?.[index]?.amount && (
                  <p className="text-xs text-destructive">
                    {errors.items[index]?.amount?.message}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {errors.items?.root && (
          <p className="text-xs text-destructive">{errors.items.root.message}</p>
        )}

        {/* Total */}
        <div className="flex justify-end pt-2 border-t border-border">
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
              Total
            </p>
            <p className="text-lg font-bold tabular-nums">
              US${" "}
              {total.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Invoice number preview */}
      {invoicePreview && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-xs text-muted-foreground mb-0.5">Número da invoice (gerado automaticamente)</p>
          <p className="font-mono text-sm font-semibold tracking-wide">{invoicePreview}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={submitting}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          <FileDown className="mr-2 h-4 w-4" />
          {submitting ? "Gerando PDF…" : "Gerar invoice"}
        </Button>
      </div>
    </form>
  );
}
