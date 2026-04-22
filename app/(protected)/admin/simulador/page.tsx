import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CountryToggle } from "./CountryToggle";
import { LeadsTable } from "./LeadsTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata = { title: "Simulador — Admin" };

async function toggleCountryAction(id: string, active: boolean) {
  "use server";
  await prisma.simulatorCountry.update({ where: { id }, data: { active } });
  revalidatePath("/admin/simulador");
}

export default async function AdminSimuladorPage() {
  const [countries, leads] = await Promise.all([
    prisma.simulatorCountry.findMany({
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true, flagEmoji: true, countryCode: true, active: true, displayOrder: true, updatedAt: true },
    }),
    prisma.simulatorLead.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, name: true, email: true, phone: true, message: true, utmSource: true, createdAt: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Simulador</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie os países disponíveis no simulador e visualize leads captados.
        </p>
      </div>

      <Tabs defaultValue="paises">
        <TabsList>
          <TabsTrigger value="paises">Países</TabsTrigger>
          <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="paises" className="mt-4">
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>País</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead className="text-center">Ordem</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Ativo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {countries.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.flagEmoji && <span className="mr-2">{c.flagEmoji}</span>}
                      {c.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">{c.countryCode}</Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">{c.displayOrder}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={c.active ? "default" : "secondary"}>
                        {c.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <CountryToggle id={c.id} active={c.active} toggleAction={toggleCountryAction} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="leads" className="mt-4">
          <LeadsTable leads={leads} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
