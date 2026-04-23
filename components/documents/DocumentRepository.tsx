"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Upload,
  Trash2,
  ExternalLink,
  File,
  FileSpreadsheet,
  Image,
} from "lucide-react";
import { toast } from "sonner";
import type { DocumentCategory } from "@prisma/client";

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  PERSONAL_ID: "Documento pessoal",
  ADDRESS_PROOF: "Comprovante de endereço",
  GENNESYS_CONTRACT: "Contrato Gennesys",
  OBLIGATION_TEMPLATE: "Template de obrigação",
  INVOICE: "Invoice",
  PAYMENT_PROOF: "Comprovante de pagamento",
  OPENING_REQUESTED_DOC: "Abertura — doc solicitado",
  OPENING_FILLED_FORM: "Abertura — formulário preenchido",
  OPENING_SIGNED_DOC: "Abertura — doc assinado",
  ACCOUNTING_REPORT: "Relatório contábil",
  BANK_STATEMENT: "Extrato bancário",
  TAX_RETURN: "Declaração fiscal",
  CORPORATE_DOCUMENT: "Documento societário",
  OTHER: "Outro",
};

const REPOSITORY_CATEGORIES: DocumentCategory[] = [
  "ACCOUNTING_REPORT",
  "BANK_STATEMENT",
  "TAX_RETURN",
  "CORPORATE_DOCUMENT",
  "PERSONAL_ID",
  "ADDRESS_PROOF",
  "INVOICE",
  "PAYMENT_PROOF",
  "GENNESYS_CONTRACT",
  "OTHER",
];

const CATEGORY_VARIANT: Record<DocumentCategory, "default" | "secondary" | "outline"> = {
  ACCOUNTING_REPORT: "default",
  BANK_STATEMENT: "default",
  TAX_RETURN: "default",
  CORPORATE_DOCUMENT: "default",
  PERSONAL_ID: "secondary",
  ADDRESS_PROOF: "secondary",
  GENNESYS_CONTRACT: "secondary",
  OBLIGATION_TEMPLATE: "outline",
  INVOICE: "secondary",
  PAYMENT_PROOF: "secondary",
  OPENING_REQUESTED_DOC: "outline",
  OPENING_FILLED_FORM: "outline",
  OPENING_SIGNED_DOC: "outline",
  OTHER: "outline",
};

export interface DocItem {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  category: DocumentCategory;
  description: string | null;
  driveUrl: string | null;
  createdAt: Date | string;
}

interface Props {
  initialDocs: DocItem[];
  clientName: string;
  offshoreName?: string;
  individualClientId?: string;
  offshoreId?: string;
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Image className="h-4 w-4 shrink-0 text-muted-foreground" />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return <FileSpreadsheet className="h-4 w-4 shrink-0 text-muted-foreground" />;
  if (mimeType === "application/pdf") return <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />;
  return <File className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentRepository({
  initialDocs,
  clientName,
  offshoreName,
  individualClientId,
  offshoreId,
}: Props) {
  const [docs, setDocs] = useState<DocItem[]>(initialDocs);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [category, setCategory] = useState<DocumentCategory | "">("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (!selectedFile || !category) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("category", category);
      fd.append("clientName", clientName);
      if (offshoreName) fd.append("offshoreName", offshoreName);
      if (individualClientId) fd.append("individualClientId", individualClientId);
      if (offshoreId) fd.append("offshoreId", offshoreId);
      if (description.trim()) fd.append("description", description.trim());

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error?.message ?? "Erro ao fazer upload");
        return;
      }

      setDocs((prev) => [json.data, ...prev]);
      setOpen(false);
      setSelectedFile(null);
      setCategory("");
      setDescription("");
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Documento enviado com sucesso");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(docId: string) {
    setDeleting(docId);
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error?.message ?? "Erro ao excluir documento");
        return;
      }
      setDocs((prev) => prev.filter((d) => d.id !== docId));
      toast.success("Documento excluído");
    } finally {
      setDeleting(null);
    }
  }

  const grouped = REPOSITORY_CATEGORIES.reduce<Record<string, DocItem[]>>((acc, cat) => {
    const items = docs.filter((d) => d.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {docs.length} {docs.length === 1 ? "documento" : "documentos"}
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Anexar documento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Anexar documento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="doc-category">Tipo de documento</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as DocumentCategory)}
                >
                  <SelectTrigger id="doc-category">
                    <SelectValue placeholder="Selecione o tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {REPOSITORY_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="doc-description">
                  Descrição <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Textarea
                  id="doc-description"
                  placeholder="Ex: Balanço Patrimonial 2024, Extrato Bradesco jan/2025..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="doc-file">Arquivo</Label>
                <Input
                  id="doc-file"
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">
                  PDF, imagens, Word, Excel — máx. 20 MB
                </p>
              </div>

              <Button
                className="w-full"
                onClick={handleUpload}
                disabled={!selectedFile || !category || uploading}
              >
                {uploading ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {docs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Nenhum documento anexado. Clique em &quot;Anexar documento&quot; para começar.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {CATEGORY_LABELS[cat as DocumentCategory]}
              </p>
              <div className="space-y-2">
                {items.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border px-4 py-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      {fileIcon(doc.mimeType)}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{doc.filename}</p>
                        {doc.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{doc.description}</p>
                        )}
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatSize(doc.sizeBytes)} ·{" "}
                          {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {doc.driveUrl && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <a href={doc.driveUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(doc.id)}
                        disabled={deleting === doc.id}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
