import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccessCodeGenerator } from "./AccessCodeGenerator";
import { UserRoleEditor } from "./UserRoleEditor";

export const metadata = { title: "Usuários — Admin" };

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  OPERATOR: "Operador",
};

const ROLE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  SUPER_ADMIN: "default",
  ADMIN: "secondary",
  OPERATOR: "outline",
};

export default async function UsuariosPage() {
  const session = await getSession();
  if (session?.role !== "SUPER_ADMIN") redirect("/dashboard");

  const [users, accessCodes] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
    prisma.accessCode.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { createdBy: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
          <p className="mt-1 text-sm text-muted-foreground">{users.length} usuário{users.length !== 1 ? "s" : ""}</p>
        </div>
        <AccessCodeGenerator />
      </div>

      <Tabs defaultValue="usuarios">
        <TabsList>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="codigos">Códigos de acesso</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-4">
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={ROLE_VARIANT[u.role]}>{ROLE_LABEL[u.role] ?? u.role}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(u.createdAt, "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      {u.id !== session?.id && (
                        <UserRoleEditor userId={u.id} currentRole={u.role} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="codigos" className="mt-4">
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Papel pretendido</TableHead>
                  <TableHead>Criado por</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accessCodes.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">Nenhum código gerado.</TableCell></TableRow>
                )}
                {accessCodes.map((c) => {
                  const used = !!c.usedBy;
                  const expired = !used && c.expiresAt < new Date();
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-sm">{c.code}</TableCell>
                      <TableCell>
                        <Badge variant={ROLE_VARIANT[c.intendedRole]}>{ROLE_LABEL[c.intendedRole] ?? c.intendedRole}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.createdBy.name}</TableCell>
                      <TableCell className="text-sm">{format(c.expiresAt, "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={used ? "default" : expired ? "destructive" : "secondary"}>
                          {used ? "Usado" : expired ? "Expirado" : "Disponível"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
