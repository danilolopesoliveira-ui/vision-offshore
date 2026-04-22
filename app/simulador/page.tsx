import { prisma } from "@/lib/db";
import { SimuladorClient } from "./SimuladorClient";

export const metadata = {
  title: "Simulador Tributário — Gennesys",
  description: "Compare a carga tributária no Brasil com jurisdições offshore e descubra quanto você pode economizar.",
};

export default async function SimuladorPage() {
  let countries: { id: string; name: string; flagEmoji: string | null; countryCode: string }[] = [];
  try {
    countries = await prisma.simulatorCountry.findMany({
      where: { active: true },
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true, flagEmoji: true, countryCode: true },
    });
  } catch {
    // DB not available during static build
  }

  return (
    <main className="min-h-screen bg-background">
      <SimuladorClient countries={countries} />
    </main>
  );
}
