import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Auditoria — Admin" };

const PAGE_SIZE = 50;

const ACTION_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  CREATE:  "default",
  UPDATE:  "secondary",
  DELETE:  "destructive",
  SIGNUP:  "default",
  ADVANCE_STAGE: "secondary",
  MARK_PAID: "default",
  MARK_CANCELLED: "outline",
};

interface PageProps {
  searchParams: Promise<{ entity?: string; action?: string; page?: string }>;
}

export default async function AuditoriaPage({ searchParams }: PageProps) {
  const { entity = "", action = "", page = "1" } = await searchParams;
  const skip = (parseInt(page) - 1) * PAGE_SIZE;

  const where = {
    ...(entity ? { entityType: { contains: entity, mode: "insensitive" as const } } : {}),
    ...(action ? { action: { contains: action, mode: "insensitive" as const } } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = parseInt(page);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Auditoria</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} registro{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filters */}
      <form method="GET" className="flex gap-3 flex-wrap">
        <Input name="entity" defaultValue={entity} placeholder="Entidade (ex.: Obligation)" className="w-48" />
        <Input name="action" defaultValue={action} placeholder="Ação (ex.: CREATE)" className="w-48" />
        <Button type="submit" variant="outline" size="sm">Filtrar</Button>
        {(entity || action) && (
          <Button variant="ghost" size="sm" asChild>
            <a href="/admin/auditoria">Limpar</a>
          </Button>
        )}
      </form>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Entidade</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            )}
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(log.createdAt, "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                </TableCell>
                <TableCell className="text-sm">
                  {log.user ? (
                    <span title={log.user.email}>{log.user.name}</span>
                  ) : (
                    <span className="text-muted-foreground">Sistema</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs font-mono">
                    {log.entityType}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground max-w-[120px] truncate">
                  {log.entityId}
                </TableCell>
                <TableCell>
                  <Badge variant={ACTION_VARIANT[log.action] ?? "secondary"} className="text-xs">
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {log.ipAddress ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Página {currentPage} de {totalPages}</span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Button variant="outline" size="sm" asChild>
                <a href={`?entity=${entity}&action=${action}&page=${currentPage - 1}`}>Anterior</a>
              </Button>
            )}
            {currentPage < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <a href={`?entity=${entity}&action=${action}&page=${currentPage + 1}`}>Próxima</a>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
