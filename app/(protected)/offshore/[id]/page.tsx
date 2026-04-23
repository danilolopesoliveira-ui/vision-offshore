import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, DollarSign, ClipboardList, FileText, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import DocumentRepository from "@/components/documents/DocumentRepository";

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

const OBL_STATUS_LABEL = {
  PENDING: "Pendente",
  PAID: "Paga",
  CANCELLED: "Cancelada",
} as const;

const OBL_STATUS_VARIANT = {
  PENDING: "secondary",
  PAID: "default",
  CANCELLED: "outline",
} as const;

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const o = await prisma.offshoreCompany.findUnique({ where: { id }, select: { name: true } });
  return { title: o ? `${o.name} — Vision Offshore` : "Offshore" };
}

export default async function OffshorePage({ params }: Props) {
  const { id } = await params;

  const offshore = await prisma.offshoreCompany.findUnique({
    where: { id },
    include: {
      individualClient: { select: { id: true, name: true } },
      jurisdiction: true,
      jointTenants: true,
      gennesysContract: true,
      obligations: {
        orderBy: { dueDateOriginal: "asc" },
        include: { serviceProvider: { select: { name: true } } },
      },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!offshore) notFound();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight">{offshore.name}</h1>
            <Badge
              variant={STATUS_VARIANT[offshore.status] as "default" | "secondary" | "outline" | "destructive"}
            >
              {STATUS_LABEL[offshore.status]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {offshore.jurisdiction.name} ({offshore.jurisdiction.countryCode}) ·{" "}
            <Link href={`/clientes/${offshore.individualClient.id}`} className="hover:underline">
              {offshore.individualClient.name}
            </Link>
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/offshore/${id}/editar`}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Patrimônio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">
              {offshore.declaredWealthUsd != null
                ? Number(offshore.declaredWealthUsd).toLocaleString("en-US", {
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
              <ClipboardList className="h-3.5 w-3.5" />
              Obrigações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{offshore.obligations.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Cotitulares
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">
              {offshore.jointTenancy ? offshore.jointTenants.length : "—"}
            </p>
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
            <p className="text-xl font-bold">{offshore.documents.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="obrigacoes">Obrigações</TabsTrigger>
          <TabsTrigger value="contrato">Contrato</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
        </TabsList>

        {/* Dados */}
        <TabsContent value="dados" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações gerais</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Jurisdição
                  </dt>
                  <dd className="mt-1 text-sm">
                    {offshore.jurisdiction.name} ({offshore.jurisdiction.countryCode})
                    {offshore.jurisdiction.isTaxHaven && (
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        Tax Haven
                      </Badge>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Criada em
                  </dt>
                  <dd className="mt-1 text-sm">
                    {format(offshore.createdAt, "dd/MM/yyyy", { locale: ptBR })}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {offshore.jointTenancy && (
            <Card>
              <CardHeader>
                <CardTitle>Cotitulares</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {offshore.jointTenants.map((jt) => (
                  <div
                    key={jt.id}
                    className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{jt.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {jt.documentType} {jt.documentNumber}
                      </p>
                    </div>
                    <Badge variant="secondary">{Number(jt.percentage).toFixed(2)}%</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Obrigações */}
        <TabsContent value="obrigacoes" className="mt-4">
          {offshore.obligations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Nenhuma obrigação cadastrada.
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-lg border border-border divide-y divide-border">
              {offshore.obligations.map((ob) => {
                const dueDate = ob.dueDateAdjusted ?? ob.dueDateOriginal;
                return (
                  <div key={ob.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{ob.nature}</p>
                      <p className="text-xs text-muted-foreground">
                        Vence {format(dueDate, "dd/MM/yyyy")}
                        {ob.serviceProvider && ` · ${ob.serviceProvider.name}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      {ob.invoiceValue && (
                        <span className="text-sm font-mono">
                          {Number(ob.invoiceValue).toLocaleString("en-US", {
                            style: "currency",
                            currency: ob.invoiceCurrency,
                          })}
                        </span>
                      )}
                      <Badge
                        variant={OBL_STATUS_VARIANT[ob.status] as "default" | "secondary" | "outline"}
                      >
                        {OBL_STATUS_LABEL[ob.status]}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Contrato */}
        <TabsContent value="contrato" className="mt-4">
          {!offshore.gennesysContract ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Contrato Gennesys não cadastrado.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Contrato Gennesys</CardTitle>
                {offshore.gennesysContract.contractDate && (
                  <CardDescription>
                    Data:{" "}
                    {format(offshore.gennesysContract.contractDate, "dd/MM/yyyy", { locale: ptBR })}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 text-sm">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Implementação
                    </dt>
                    <dd className="mt-1">
                      {offshore.gennesysContract.implementationValue != null
                        ? Number(offshore.gennesysContract.implementationValue).toLocaleString(
                            "en-US",
                            {
                              style: "currency",
                              currency: offshore.gennesysContract.implementationCurrency,
                            }
                          )
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Manutenção
                    </dt>
                    <dd className="mt-1">
                      {offshore.gennesysContract.maintenanceValue != null
                        ? Number(offshore.gennesysContract.maintenanceValue).toLocaleString(
                            "en-US",
                            {
                              style: "currency",
                              currency: offshore.gennesysContract.maintenanceCurrency,
                            }
                          )
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Gestão de portfólio
                    </dt>
                    <dd className="mt-1">
                      {offshore.gennesysContract.portfolioManagement ? "Sim" : "Não"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Contabilidade
                    </dt>
                    <dd className="mt-1">
                      {offshore.gennesysContract.accountingEnabled ? "Sim" : "Não"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      DCBE
                    </dt>
                    <dd className="mt-1">
                      {offshore.gennesysContract.dcbeEnabled ? "Sim" : "Não"}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Documentos */}
        <TabsContent value="documentos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Repositório de documentos</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentRepository
                initialDocs={offshore.documents}
                clientName={offshore.individualClient.name}
                offshoreName={offshore.name}
                individualClientId={offshore.individualClient.id}
                offshoreId={offshore.id}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
