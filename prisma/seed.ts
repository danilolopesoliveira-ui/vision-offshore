import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  const superAdminEmail = process.env.FIRST_SUPER_ADMIN_EMAIL;
  if (!superAdminEmail) throw new Error("FIRST_SUPER_ADMIN_EMAIL not set");

  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      email: superAdminEmail,
      name: "Administrador Gennesys",
      role: "SUPER_ADMIN",
    },
  });

  console.log(`Super admin: ${superAdmin.email}`);

  const firstCode = process.env.FIRST_ACCESS_CODE;
  if (firstCode) {
    const existing = await prisma.accessCode.findUnique({ where: { code: firstCode } });
    if (!existing) {
      await prisma.accessCode.create({
        data: {
          code: firstCode,
          createdById: superAdmin.id,
          intendedRole: "ADMIN",
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      console.log("Access code created.");
    }
  }

  // Jurisdictions
  const bvi = await prisma.jurisdiction.upsert({
    where: { name: "Ilhas Virgens Britânicas (BVI)" },
    update: {},
    create: {
      name: "Ilhas Virgens Britânicas (BVI)",
      countryCode: "VG",
      isTaxHaven: true,
    },
  });

  const cayman = await prisma.jurisdiction.upsert({
    where: { name: "Ilhas Cayman" },
    update: {},
    create: {
      name: "Ilhas Cayman",
      countryCode: "KY",
      isTaxHaven: true,
    },
  });

  const delaware = await prisma.jurisdiction.upsert({
    where: { name: "Estados Unidos (Delaware)" },
    update: {},
    create: {
      name: "Estados Unidos (Delaware)",
      countryCode: "US",
      isTaxHaven: false,
    },
  });

  await prisma.jurisdiction.upsert({
    where: { name: "Bahamas" },
    update: {},
    create: { name: "Bahamas", countryCode: "BS", isTaxHaven: true },
  });

  await prisma.jurisdiction.upsert({
    where: { name: "Uruguai" },
    update: {},
    create: { name: "Uruguai", countryCode: "UY", isTaxHaven: false },
  });

  await prisma.jurisdiction.upsert({
    where: { name: "Portugal" },
    update: {},
    create: { name: "Portugal", countryCode: "PT", isTaxHaven: false },
  });

  await prisma.jurisdiction.upsert({
    where: { name: "Luxemburgo" },
    update: {},
    create: { name: "Luxemburgo", countryCode: "LU", isTaxHaven: false },
  });

  await prisma.jurisdiction.upsert({
    where: { name: "Suíça" },
    update: {},
    create: { name: "Suíça", countryCode: "CH", isTaxHaven: false },
  });

  await prisma.jurisdiction.upsert({
    where: { name: "Espanha" },
    update: {},
    create: { name: "Espanha", countryCode: "ES", isTaxHaven: false },
  });

  console.log("Jurisdictions seeded.");

  // Service Providers
  await prisma.serviceProvider.upsert({
    where: { id: "provider-bvi-01" },
    update: {},
    create: {
      id: "provider-bvi-01",
      name: "BVI Fiduciária Ltda.",
      email: "ops@bvifiduciaria.com",
      responsibleName: "James Henderson",
      responsiblePhone: "+1-284-555-0100",
    },
  });

  await prisma.serviceProvider.upsert({
    where: { id: "provider-cayman-01" },
    update: {},
    create: {
      id: "provider-cayman-01",
      name: "Cayman Registered Agents Inc.",
      email: "info@caymanra.ky",
      responsibleName: "Patricia Clarke",
      responsiblePhone: "+1-345-555-0200",
    },
  });

  await prisma.serviceProvider.upsert({
    where: { id: "provider-delaware-01" },
    update: {},
    create: {
      id: "provider-delaware-01",
      name: "Delaware Corporate Services LLC",
      email: "corporate@dcs.us",
      responsibleName: "Michael Thompson",
      responsiblePhone: "+1-302-555-0300",
    },
  });

  console.log("Service providers seeded.");

  // Obligation Templates
  await prisma.obligationTemplate.upsert({
    where: { id: "tmpl-bvi-annual-fee" },
    update: {},
    create: {
      id: "tmpl-bvi-annual-fee",
      jurisdictionId: bvi.id,
      serviceProviderId: "provider-bvi-01",
      nature: "Taxa Anual de Manutenção — BVI",
      recurrence: "ANNUAL",
      invoiceValue: 450,
      invoiceCurrency: "USD",
      anchorMonth: 1,
      anchorDay: 31,
    },
  });

  await prisma.obligationTemplate.upsert({
    where: { id: "tmpl-cayman-annual-fee" },
    update: {},
    create: {
      id: "tmpl-cayman-annual-fee",
      jurisdictionId: cayman.id,
      serviceProviderId: "provider-cayman-01",
      nature: "Taxa Anual de Manutenção — Cayman",
      recurrence: "ANNUAL",
      invoiceValue: 854,
      invoiceCurrency: "USD",
      anchorMonth: 1,
      anchorDay: 31,
    },
  });

  await prisma.obligationTemplate.upsert({
    where: { id: "tmpl-delaware-annual-report" },
    update: {},
    create: {
      id: "tmpl-delaware-annual-report",
      jurisdictionId: delaware.id,
      serviceProviderId: "provider-delaware-01",
      nature: "Annual Report Filing — Delaware",
      recurrence: "ANNUAL",
      invoiceValue: 300,
      invoiceCurrency: "USD",
      anchorMonth: 3,
      anchorDay: 1,
    },
  });

  console.log("Obligation templates seeded.");

  // Simulator Countries
  const countries = [
    {
      name: "Brasil",
      flagEmoji: "🇧🇷",
      countryCode: "BR",
      displayOrder: 0,
      active: false, // base de comparação, não listado como destino
      pjTaxConfig: {
        corporateIncomeTax: { rate: 0.15, base: "profit", notes: "IRPJ + CSLL aprox. combinado" },
        additionalIncomeTax: { rate: 0.10, threshold: 240000 },
        socialContributions: { pis: 0.0165, cofins: 0.076, base: "revenue" },
        dividendWithholding: { standard: 0, treatyBrazil: 0 },
        effectiveRateHint: "28-34% sobre lucro (Lucro Real)",
      },
      pfTaxConfig: {
        incomeTax: {
          type: "progressive",
          brackets: [
            { upTo: 29145.60, rate: 0, currency: "BRL" },
            { upTo: 33919.80, rate: 0.075, currency: "BRL" },
            { upTo: 45012.60, rate: 0.15, currency: "BRL" },
            { upTo: 55976.16, rate: 0.225, currency: "BRL" },
            { upTo: null, rate: 0.275, currency: "BRL" },
          ],
        },
        dividendIncome: { rate: 0, notes: "Isentos atualmente (Lei 9.249/1995)" },
        interestIncome: { rate: 0.175 },
        capitalGainsTax: { shortTerm: 0.15, longTerm: 0.15 },
        effectiveRateHint: "Até 27,5% renda trabalho",
      },
      sourcesNotes: "",
    },
    {
      name: "Estados Unidos (Delaware)",
      flagEmoji: "🇺🇸",
      countryCode: "US",
      displayOrder: 1,
      pjTaxConfig: {
        corporateIncomeTax: { rate: 0.21, base: "profit", notes: "Federal CIT flat 21%" },
        stateIncomeTax: { rate: 0.087, condition: "Aplicável se operar no estado" },
        dividendWithholding: { standard: 0.30, treatyBrazil: null, notes: "Sem tratado Brasil-EUA" },
        capitalGainsTax: { rate: 0.21 },
        annualFees: [{ name: "Delaware Franchise Tax", value: 400, currency: "USD" }],
        effectiveRateHint: "~26-30% combinado federal+state",
        participationExemption: false,
      },
      pfTaxConfig: {
        incomeTax: {
          type: "progressive",
          brackets: [
            { upTo: 11600, rate: 0.10, currency: "USD" },
            { upTo: 47150, rate: 0.12, currency: "USD" },
            { upTo: 100525, rate: 0.22, currency: "USD" },
            { upTo: 191950, rate: 0.24, currency: "USD" },
            { upTo: 243725, rate: 0.32, currency: "USD" },
            { upTo: 609350, rate: 0.35, currency: "USD" },
            { upTo: null, rate: 0.37, currency: "USD" },
          ],
        },
        dividendIncome: { rate: 0.20, notes: "Qualified dividends" },
        interestIncome: { rate: 0.37 },
        capitalGainsTax: { shortTerm: 0.37, longTerm: 0.20 },
        effectiveRateHint: "Até 37% renda trabalho",
      },
      sourcesNotes: "",
    },
    {
      name: "Ilhas Virgens Britânicas (BVI)",
      flagEmoji: "🇻🇬",
      countryCode: "VG",
      displayOrder: 2,
      pjTaxConfig: {
        corporateIncomeTax: { rate: 0, base: "profit", notes: "Zero imposto corporativo" },
        dividendWithholding: { standard: 0, treatyBrazil: 0 },
        annualFees: [
          { name: "Government Annual Fee", value: 450, currency: "USD" },
          { name: "Registered Agent", value: 1200, currency: "USD" },
        ],
        effectiveRateHint: "0% imposto — apenas taxas anuais",
        participationExemption: true,
      },
      pfTaxConfig: {
        incomeTax: { type: "flat", flatRate: 0 },
        dividendIncome: { rate: 0 },
        interestIncome: { rate: 0 },
        capitalGainsTax: { shortTerm: 0, longTerm: 0 },
        effectiveRateHint: "0% para não-residentes",
      },
      sourcesNotes: "",
    },
    {
      name: "Ilhas Cayman",
      flagEmoji: "🇰🇾",
      countryCode: "KY",
      displayOrder: 3,
      pjTaxConfig: {
        corporateIncomeTax: { rate: 0, base: "profit", notes: "Zero imposto corporativo" },
        dividendWithholding: { standard: 0, treatyBrazil: 0 },
        annualFees: [
          { name: "Government Annual Fee (Exempted Co.)", value: 854, currency: "USD" },
          { name: "Registered Office", value: 1500, currency: "USD" },
        ],
        effectiveRateHint: "0% imposto — apenas taxas anuais",
        participationExemption: true,
      },
      pfTaxConfig: {
        incomeTax: { type: "flat", flatRate: 0 },
        dividendIncome: { rate: 0 },
        interestIncome: { rate: 0 },
        capitalGainsTax: { shortTerm: 0, longTerm: 0 },
        effectiveRateHint: "0% para não-residentes",
      },
      sourcesNotes: "",
    },
    {
      name: "Bahamas",
      flagEmoji: "🇧🇸",
      countryCode: "BS",
      displayOrder: 4,
      pjTaxConfig: {
        corporateIncomeTax: { rate: 0, base: "profit" },
        businessLicense: { rate: 0.0075, base: "revenue", notes: "Business License 0.75% sobre receita" },
        dividendWithholding: { standard: 0, treatyBrazil: 0 },
        annualFees: [{ name: "Annual Government Fee", value: 350, currency: "USD" }],
        effectiveRateHint: "~0.75% sobre receita (Business License)",
      },
      pfTaxConfig: {
        incomeTax: { type: "flat", flatRate: 0 },
        dividendIncome: { rate: 0 },
        interestIncome: { rate: 0 },
        capitalGainsTax: { shortTerm: 0, longTerm: 0 },
        effectiveRateHint: "0% imposto de renda",
      },
      sourcesNotes: "",
    },
    {
      name: "Uruguai",
      flagEmoji: "🇺🇾",
      countryCode: "UY",
      displayOrder: 5,
      pjTaxConfig: {
        corporateIncomeTax: { rate: 0.25, base: "profit", notes: "IRAE 25%" },
        dividendWithholding: { standard: 0.07, treatyBrazil: 0.10, notes: "Tratado Brasil-Uruguai" },
        capitalGainsTax: { rate: 0.12 },
        effectiveRateHint: "~30% combinado (IRAE + IRNR dividendos)",
        specialRegimes: [
          { name: "Zona Franca", description: "0% IRAE para atividades elegíveis na zona franca" },
        ],
      },
      pfTaxConfig: {
        incomeTax: {
          type: "progressive",
          brackets: [
            { upTo: 131196, rate: 0, currency: "UYU" },
            { upTo: 196794, rate: 0.10, currency: "UYU" },
            { upTo: 393588, rate: 0.15, currency: "UYU" },
            { upTo: 984012, rate: 0.24, currency: "UYU" },
            { upTo: 1968024, rate: 0.25, currency: "UYU" },
            { upTo: null, rate: 0.30, currency: "UYU" },
          ],
        },
        dividendIncome: { rate: 0.07 },
        interestIncome: { rate: 0.12 },
        capitalGainsTax: { shortTerm: 0.12, longTerm: 0.12 },
        effectiveRateHint: "Até 30% renda trabalho",
      },
      sourcesNotes: "",
    },
    {
      name: "Portugal",
      flagEmoji: "🇵🇹",
      countryCode: "PT",
      displayOrder: 6,
      pjTaxConfig: {
        corporateIncomeTax: { rate: 0.20, base: "profit", notes: "IRC 20% (PMEs) ou 21% standard" },
        municiaplSurcharge: { rate: 0.015, notes: "Derrama municipal média" },
        stateSurcharge: { brackets: [{ upTo: 1500000, rate: 0 }, { upTo: 7500000, rate: 0.03 }, { upTo: null, rate: 0.09 }] },
        dividendWithholding: { standard: 0.25, treatyBrazil: 0.15, notes: "Tratado Brasil-Portugal" },
        effectiveRateHint: "~21-31% total (IRC + derramas)",
        specialRegimes: [
          { name: "Regime IFICI (ex-NHR)", description: "Taxa reduzida para certas atividades qualificadas" },
        ],
      },
      pfTaxConfig: {
        incomeTax: {
          type: "progressive",
          brackets: [
            { upTo: 7703, rate: 0.1325, currency: "EUR" },
            { upTo: 11623, rate: 0.18, currency: "EUR" },
            { upTo: 16472, rate: 0.23, currency: "EUR" },
            { upTo: 21321, rate: 0.26, currency: "EUR" },
            { upTo: 27146, rate: 0.3275, currency: "EUR" },
            { upTo: 39791, rate: 0.37, currency: "EUR" },
            { upTo: 51997, rate: 0.435, currency: "EUR" },
            { upTo: 81199, rate: 0.45, currency: "EUR" },
            { upTo: null, rate: 0.48, currency: "EUR" },
          ],
        },
        dividendIncome: { rate: 0.28, notes: "Taxa liberatória" },
        interestIncome: { rate: 0.28 },
        capitalGainsTax: { shortTerm: 0.28, longTerm: 0.28 },
        specialRegimes: [
          { name: "IFICI", description: "20% flat sobre rendimentos qualificados por 10 anos", flatRate: 0.20, duration: 10 },
        ],
        effectiveRateHint: "Até 48% regular; 20% com IFICI",
      },
      sourcesNotes: "",
    },
    {
      name: "Luxemburgo",
      flagEmoji: "🇱🇺",
      countryCode: "LU",
      displayOrder: 7,
      pjTaxConfig: {
        corporateIncomeTax: { rate: 0.17, base: "profit", notes: "CIT 17% + solidarity surcharge" },
        municipalTax: { rate: 0.0675, notes: "Taxa municipal de negócios (Lux-Cidade)" },
        combinedRate: { rate: 0.2494, notes: "Taxa efetiva combinada ~24.94%" },
        dividendWithholding: { standard: 0.15, treatyBrazil: 0.15, notes: "Tratado Brasil-Luxemburgo" },
        participationExemption: true,
        effectiveRateHint: "~24.94% combinado — participation exemption disponível",
      },
      pfTaxConfig: {
        incomeTax: {
          type: "progressive",
          brackets: [
            { upTo: 12438, rate: 0, currency: "EUR" },
            { upTo: 41832, rate: 0.08, currency: "EUR" },
            { upTo: null, rate: 0.42, currency: "EUR" },
          ],
        },
        dividendIncome: { rate: 0.15, notes: "50% isenção sobre dividendos qualificados" },
        interestIncome: { rate: 0.20 },
        capitalGainsTax: { shortTerm: 0.42, longTerm: 0 },
        effectiveRateHint: "Até 42% regular",
      },
      sourcesNotes: "",
    },
    {
      name: "Suíça",
      flagEmoji: "🇨🇭",
      countryCode: "CH",
      displayOrder: 8,
      pjTaxConfig: {
        corporateIncomeTax: { rate: 0.085, base: "profit", notes: "Federal 8.5% sobre lucro líquido" },
        cantonalTax: { rateRange: [0.03, 0.21], notes: "Varia por cantão — Zug ~11.8%, Zurique ~19.7%" },
        dividendWithholding: { standard: 0.35, treatyBrazil: 0.15, notes: "Tratado Brasil-Suíça" },
        effectiveRateHint: "~11-25% combinado dependendo do cantão",
      },
      pfTaxConfig: {
        incomeTax: {
          type: "progressive",
          brackets: [
            { upTo: 17800, rate: 0, currency: "CHF" },
            { upTo: null, rate: 0.115, currency: "CHF", notes: "Federal — cantonal adicional" },
          ],
        },
        dividendIncome: { rate: 0.35, notes: "Imposto de retenção com possibilidade de reembolso" },
        interestIncome: { rate: 0.35 },
        capitalGainsTax: { shortTerm: 0, longTerm: 0, notes: "Ganhos de capital PF geralmente isentos" },
        specialRegimes: [
          { name: "Lump-sum taxation", description: "Tributação forfetária baseada em despesas para residentes não-suíços" },
        ],
        effectiveRateHint: "~22-40% federal+cantonal+municipal",
      },
      sourcesNotes: "",
    },
    {
      name: "Espanha",
      flagEmoji: "🇪🇸",
      countryCode: "ES",
      displayOrder: 9,
      pjTaxConfig: {
        corporateIncomeTax: { rate: 0.25, base: "profit", notes: "IS 25% standard" },
        dividendWithholding: { standard: 0.19, treatyBrazil: 0.15, notes: "Tratado Brasil-Espanha" },
        capitalGainsTax: { rate: 0.25 },
        effectiveRateHint: "~25% IS + derramas locais",
      },
      pfTaxConfig: {
        incomeTax: {
          type: "progressive",
          brackets: [
            { upTo: 12450, rate: 0.19, currency: "EUR" },
            { upTo: 20200, rate: 0.24, currency: "EUR" },
            { upTo: 35200, rate: 0.30, currency: "EUR" },
            { upTo: 60000, rate: 0.37, currency: "EUR" },
            { upTo: 300000, rate: 0.45, currency: "EUR" },
            { upTo: null, rate: 0.47, currency: "EUR" },
          ],
        },
        dividendIncome: { rate: 0.19 },
        interestIncome: { rate: 0.19 },
        capitalGainsTax: { shortTerm: 0.19, longTerm: 0.19 },
        specialRegimes: [
          {
            name: "Regime Beckham",
            description: "24% flat sobre rendimentos até €600k para expatriados qualificados",
            flatRate: 0.24,
            duration: 6,
          },
        ],
        effectiveRateHint: "Até 47% regular; 24% com Beckham",
      },
      sourcesNotes: "",
    },
  ];

  for (const country of countries) {
    await prisma.simulatorCountry.upsert({
      where: { countryCode: country.countryCode },
      update: { updatedAt: new Date() },
      create: {
        ...country,
        updatedAt: new Date(),
      },
    });
  }

  console.log("Simulator countries seeded.");
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
