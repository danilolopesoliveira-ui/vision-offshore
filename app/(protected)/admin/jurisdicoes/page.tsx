import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";

export const metadata = { title: "Jurisdições — Admin" };

export default async function JurisdicoesPage() {
  const jurisdictions = await prisma.jurisdiction.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { offshores: true, obligationTemplates: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Jurisdições</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {jurisdictions.length} jurisdiç{jurisdictions.length !== 1 ? "ões" : "ão"}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/jurisdicoes/nova">
            <Plus className="mr-2 h-4 w-4" />
            Nova jurisdição
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Código</TableHead>
              <TableHead className="text-center">Tax Haven</TableHead>
              <TableHead className="text-center">Offshores</TableHead>
              <TableHead className="text-center">Templates</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {jurisdictions.map((j) => (
              <TableRow key={j.id}>
                <TableCell className="font-medium">{j.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-xs">
                    {j.countryCode}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">{j.isTaxHaven ? "★" : "—"}</TableCell>
                <TableCell className="text-center text-sm">{j._count.offshores}</TableCell>
                <TableCell className="text-center text-sm">{j._count.obligationTemplates}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={j.active ? "default" : "secondary"}>
                    {j.active ? "Ativa" : "Inativa"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/jurisdicoes/${j.id}/editar`}>Editar</Link>
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
