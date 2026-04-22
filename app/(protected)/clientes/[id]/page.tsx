import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Pencil, Building2, FileText, DollarSign } from "lucide-react";
import type { Address } from "@/types/address";

const DOC_LABEL = { CPF: "CPF", CNH: "CNH", PASSPORT: "Passaporte" } as const;
const STATUS_LABEL = {
  IN_OPENING: "Em abertura",
  ACTIVE: "Ativa",
  SUSPENDED: "Suspensa",
  CLOSED: "Encerrada",
} as const;
const STATUS_VARIANT = {
  IN_OPENING: "secondary",
  ACTIVE: "default",
  SUSPENDED: "outline",
  CLOSED: "destructive",
} as const;

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const client = await prisma.individualClient.findUnique({ where: { id }, select: { name: true } });
  return { title: client ? `${client.name} — Vision Offshore` : "Cliente" };
}

export default async function ClientePage({ params }: Props) {
  const { id } = await params;

  const client = await prisma.individualClient.findUnique({
    where: { id },
    include: {
      offshores: {
        include: { jurisdiction: true },
        orderBy: { createdAt: "desc" },
      },
      documents: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!client) notFound();

  const addr = client.address as unknown as Address;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <Badge variant="secondary" className="mr-2 font-mono text-xs">
              {DOC_LABEL[client.documentType]}
            </Badge>
            {client.documentNumber}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/clientes/${id}/editar`}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Patrimônio declarado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {client.totalDeclaredWealthUsd != null
                ? Number(client.totalDeclaredWealthUsd).toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  })
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Empresas offshore
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{client.offshores.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Documentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{client.documents.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="offshore">Offshore</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
        </TabsList>

        {/* Dados tab */}
        <TabsContent value="dados" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Dados pessoais</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Nome
                  </dt>
                  <dd className="mt-1 text-sm">{client.name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {DOC_LABEL[client.documentType]}
                  </dt>
                  <dd className="mt-1 font-mono text-sm">{client.documentNumber}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Endereço
                  </dt>
                  <dd className="mt-1 text-sm">
                    {addr.logradouro}, {addr.numero}
                    {addr.complemento ? `, ${addr.complemento}` : ""} — {addr.bairro},{" "}
                    {addr.cidade}/{addr.estado} — CEP {addr.cep} — {addr.pais}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Offshore tab */}
        <TabsContent value="offshore" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button asChild size="sm">
              <Link href={`/offshore/novo?clientId=${id}`}>+ Nova offshore</Link>
            </Button>
          </div>
          {client.offshores.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Nenhuma empresa offshore cadastrada.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {client.offshores.map((o) => (
                <Card key={o.id} className="hover:bg-muted/30 transition-colors">
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <Link
                        href={`/offshore/${o.id}`}
                        className="font-medium hover:underline"
                      >
                        {o.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {o.jurisdiction.name} · {o.jurisdiction.countryCode}
                      </p>
                    </div>
                    <Badge
                      variant={STATUS_VARIANT[o.status] as "default" | "secondary" | "outline" | "destructive"}
                    >
                      {STATUS_LABEL[o.status]}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Documentos tab */}
        <TabsContent value="documentos" className="mt-4">
          {client.documents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Nenhum documento anexado.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {client.documents.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{doc.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.category} · {(doc.sizeBytes / 1024).toFixed(0)} KB
                        </p>
                      </div>
                    </div>
                    {doc.driveUrl && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={doc.driveUrl} target="_blank" rel="noopener noreferrer">
                          Abrir
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
