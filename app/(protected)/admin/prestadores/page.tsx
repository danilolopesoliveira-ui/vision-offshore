import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, KeyRound } from "lucide-react";

export const metadata = { title: "Prestadores — Admin" };

export default async function PrestadoresPage() {
  const providers = await prisma.serviceProvider.findMany({
    orderBy: { name: "asc" },
    include: {
      credential: { select: { updatedAt: true } },
      _count: { select: { obligations: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Prestadores de Serviço</h1>
          <p className="mt-1 text-sm text-muted-foreground">{providers.length} prestador{providers.length !== 1 ? "es" : ""}</p>
        </div>
        <Button asChild>
          <Link href="/admin/prestadores/novo"><Plus className="mr-2 h-4 w-4" />Novo prestador</Link>
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead className="text-center">Credenciais</TableHead>
              <TableHead className="text-center">Obrigações</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">Nenhum prestador cadastrado.</TableCell></TableRow>
            )}
            {providers.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="font-medium">{p.name}</div>
                  {p.portalUrl && (
                    <a href={p.portalUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline">Portal ↗</a>
                  )}
                </TableCell>
                <TableCell className="text-sm">{p.email}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.responsibleName ?? "—"}</TableCell>
                <TableCell className="text-center">
                  {p.credential ? (
                    <span className="flex items-center justify-center gap-1 text-primary">
                      <KeyRound className="h-3.5 w-3.5" />
                      <span className="text-xs">Salvas</span>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center text-sm">{p._count.obligations}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={p.active ? "default" : "secondary"}>{p.active ? "Ativo" : "Inativo"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/prestadores/${p.id}/editar`}>Editar</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
