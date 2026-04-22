import { prisma } from "@/lib/db";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ObligationCalendar } from "@/components/dashboard/ObligationCalendar";
import { DelinquencyTable } from "@/components/dashboard/DelinquencyTable";
import { Users, Building2, ClipboardList, AlertTriangle } from "lucide-react";
import { startOfMonth, endOfMonth } from "date-fns";

export const metadata = { title: "Dashboard — Vision Offshore" };

async function KpiCards() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [totalClients, activeOffshores, pendingThisMonth, overdueCount] = await Promise.all([
    prisma.individualClient.count(),
    prisma.offshoreCompany.count({ where: { status: "ACTIVE" } }),
    prisma.obligation.count({
      where: {
        status: "PENDING",
        OR: [
          { dueDateOriginal: { gte: monthStart, lte: monthEnd } },
          { dueDateAdjusted: { gte: monthStart, lte: monthEnd } },
        ],
      },
    }),
    prisma.obligation.count({
      where: {
        status: "PENDING",
        OR: [
          { dueDateOriginal: { lt: now }, dueDateAdjusted: null },
          { dueDateAdjusted: { lt: now } },
        ],
      },
    }),
  ]);

  const kpis = [
    {
      label: "Clientes PF",
      value: totalClients,
      icon: Users,
      description: "Total cadastrado",
    },
    {
      label: "Offshores ativas",
      value: activeOffshores,
      icon: Building2,
      description: "Status ACTIVE",
    },
    {
      label: "Obrigações este mês",
      value: pendingThisMonth,
      icon: ClipboardList,
      description: "Pendentes no mês atual",
    },
    {
      label: "Em atraso",
      value: overdueCount,
      icon: AlertTriangle,
      description: "Pendentes vencidas",
      alert: overdueCount > 0,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((k) => {
        const Icon = k.icon;
        return (
          <Card key={k.label} className={k.alert ? "border-destructive/50" : undefined}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <Icon className={`h-3.5 w-3.5 ${k.alert ? "text-destructive" : ""}`} />
                {k.label}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${k.alert ? "text-destructive" : ""}`}>
                {k.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{k.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default async function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão geral das obrigações, inadimplência e projeções.
        </p>
      </div>

      {/* KPI cards */}
      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        }
      >
        <KpiCards />
      </Suspense>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>Calendário de obrigações</CardTitle>
          <CardDescription>
            Clique em uma obrigação para ver detalhes e alterar status.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
          <ObligationCalendar />
        </CardContent>
      </Card>

      {/* Delinquency */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Inadimplência</h2>
          <p className="text-sm text-muted-foreground">
            Obrigações pendentes com vencimento passado.
          </p>
        </div>
        <Suspense fallback={<Skeleton className="h-32 w-full rounded-lg" />}>
          <DelinquencyTable />
        </Suspense>
      </div>
    </div>
  );
}
