"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, TrendingDown, TrendingUp, Info } from "lucide-react";
import type { SimulationResult } from "@/lib/tax/simulator";

interface Country {
  id: string;
  name: string;
  flagEmoji: string | null;
  countryCode: string;
}

interface Props {
  countries: Country[];
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function fmtPct(v: number) {
  return `${(v * 100).toFixed(2)}%`;
}

type AnyTaxOutput = {
  totalTaxBRL: number;
  effectiveRate: number;
  breakdown: Array<Record<string, unknown>>;
};

function ResultCard({ title, result }: { title: string; result: AnyTaxOutput | undefined }) {
  if (!result) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="rounded-lg bg-muted/40 px-4 py-3 space-y-1">
        {result.breakdown.map((item, i) => {
          const amountBRL =
            typeof item.amountBRL === "number"
              ? item.amountBRL
              : typeof item.amount === "number"
              ? item.amount
              : 0;
          return (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{String(item.tribute ?? "")}</span>
              <span className="font-mono">{fmtBRL(amountBRL)}</span>
            </div>
          );
        })}
        <Separator className="my-1" />
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>Total</span>
          <span className="font-mono">{fmtBRL(result.totalTaxBRL)}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Alíquota efetiva</span>
          <span>{fmtPct(result.effectiveRate)}</span>
        </div>
      </div>
    </div>
  );
}

export function SimuladorClient({ countries }: Props) {
  const [mode, setMode] = useState<"PJ" | "PF" | "BOTH">("PJ");
  const [countryId, setCountryId] = useState(countries[0]?.id ?? "");
  const [regime, setRegime] = useState<"SIMPLES" | "PRESUMIDO" | "REAL">("PRESUMIDO");
  const [activity, setActivity] = useState<"SERVICES" | "COMMERCE" | "INDUSTRY">("SERVICES");
  const [annualRevenue, setAnnualRevenue] = useState("1000000");
  const [annualProfit, setAnnualProfit] = useState("300000");
  const [dividends, setDividends] = useState("200000");
  const [usdBrl, setUsdBrl] = useState("5.5");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadSent, setLeadSent] = useState(false);
  const [leadLoading, setLeadLoading] = useState(false);

  async function simulate() {
    setLoading(true);
    try {
      const res = await fetch("/api/simulador", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          countryId,
          annualRevenue: parseFloat(annualRevenue.replace(/\D/g, "")),
          annualProfit: parseFloat(annualProfit.replace(/\D/g, "")),
          dividendsDistributed: parseFloat(dividends.replace(/\D/g, "")),
          usdBrlRate: parseFloat(usdBrl),
          regime,
          activity,
        }),
      });
      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  async function submitLead(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLeadLoading(true);
    const fd = new FormData(e.currentTarget);
    await fetch("/api/simulador/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        email: fd.get("email"),
        phone: fd.get("phone"),
        message: fd.get("message"),
        payload: { mode, countryId, annualRevenue, annualProfit, dividends, result },
      }),
    });
    setLeadSent(true);
    setLeadLoading(false);
  }

  const selectedCountry = countries.find((c) => c.id === countryId);
  const savings = result?.savings;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 space-y-10">
      {/* Hero */}
      <div className="text-center space-y-3">
        <Badge variant="outline" className="mb-2">Simulador Tributário</Badge>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Quanto você pagaria de imposto<br className="hidden sm:block" /> em uma estrutura offshore?
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Compare a carga tributária no Brasil com jurisdições offshore. Insira seus dados e veja a estimativa em segundos.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados da simulação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Comparar como</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PJ">Pessoa Jurídica (PJ)</SelectItem>
                  <SelectItem value="PF">Pessoa Física (PF)</SelectItem>
                  <SelectItem value="BOTH">PJ + PF combinado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Destino offshore</Label>
              <Select value={countryId} onValueChange={setCountryId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.flagEmoji} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {mode !== "PF" && (
              <>
                <div className="space-y-1.5">
                  <Label>Regime tributário (Brasil)</Label>
                  <Select value={regime} onValueChange={(v) => setRegime(v as typeof regime)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SIMPLES">Simples Nacional</SelectItem>
                      <SelectItem value="PRESUMIDO">Lucro Presumido</SelectItem>
                      <SelectItem value="REAL">Lucro Real</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Atividade</Label>
                  <Select value={activity} onValueChange={(v) => setActivity(v as typeof activity)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SERVICES">Serviços</SelectItem>
                      <SelectItem value="COMMERCE">Comércio</SelectItem>
                      <SelectItem value="INDUSTRY">Indústria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <Separator />

            <div className="space-y-1.5">
              <Label>Receita anual bruta (R$)</Label>
              <Input value={annualRevenue} onChange={(e) => setAnnualRevenue(e.target.value)} placeholder="1.000.000" />
            </div>
            <div className="space-y-1.5">
              <Label>Lucro anual (R$)</Label>
              <Input value={annualProfit} onChange={(e) => setAnnualProfit(e.target.value)} placeholder="300.000" />
            </div>
            <div className="space-y-1.5">
              <Label>Dividendos distribuídos (USD)</Label>
              <Input value={dividends} onChange={(e) => setDividends(e.target.value)} placeholder="200.000" />
            </div>
            <div className="space-y-1.5">
              <Label>Taxa USD/BRL</Label>
              <Input value={usdBrl} onChange={(e) => setUsdBrl(e.target.value)} placeholder="5.50" />
            </div>

            <Button className="w-full" onClick={simulate} disabled={loading || !countryId}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simular
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          {!result && !loading && (
            <Card className="flex items-center justify-center h-full min-h-[300px]">
              <CardContent className="text-center text-muted-foreground py-12">
                <p className="text-sm">Preencha os dados ao lado e clique em <strong>Simular</strong>.</p>
              </CardContent>
            </Card>
          )}

          {loading && (
            <Card className="flex items-center justify-center h-full min-h-[300px]">
              <CardContent className="flex flex-col items-center gap-3 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Calculando...</p>
              </CardContent>
            </Card>
          )}

          {result && !loading && (
            <>
              {/* Savings highlight */}
              {savings && (
                <Card className={savings.annualBRL > 0 ? "border-primary/40 bg-primary/5" : ""}>
                  <CardContent className="py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Economia estimada ao ano</p>
                      <p className={`text-2xl font-bold ${savings.annualBRL > 0 ? "text-primary" : "text-destructive"}`}>
                        {fmtBRL(savings.annualBRL)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ≈ USD {savings.annualUSD.toLocaleString("en-US", { maximumFractionDigits: 0 })} ·{" "}
                        {savings.effectiveRateDiff > 0 ? "-" : "+"}{fmtPct(Math.abs(savings.effectiveRateDiff))} de alíquota efetiva
                      </p>
                    </div>
                    {savings.annualBRL > 0 ? (
                      <TrendingDown className="h-8 w-8 text-primary shrink-0" />
                    ) : (
                      <TrendingUp className="h-8 w-8 text-destructive shrink-0" />
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">🇧🇷 Brasil</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ResultCard title="PJ" result={result.brazil.pj as AnyTaxOutput | undefined} />
                    <ResultCard title="PF" result={result.brazil.pf as AnyTaxOutput | undefined} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      {selectedCountry?.flagEmoji} {selectedCountry?.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ResultCard title="PJ (offshore)" result={result.destination.pj as AnyTaxOutput | undefined} />
                    <ResultCard title="PF" result={result.destination.pf as AnyTaxOutput | undefined} />
                  </CardContent>
                </Card>
              </div>

              {/* Disclaimer */}
              <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2">
                <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">{result.disclaimer}</p>
              </div>

              {/* CTA */}
              <Button className="w-full" variant="outline" onClick={() => setLeadOpen(true)}>
                Quero conversar com um especialista
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Lead capture dialog */}
      <Dialog open={leadOpen} onOpenChange={setLeadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fale com um especialista</DialogTitle>
            <DialogDescription>
              Nossa equipe entrará em contato para discutir sua estrutura ideal.
            </DialogDescription>
          </DialogHeader>
          {leadSent ? (
            <div className="py-6 text-center space-y-2">
              <p className="text-2xl">✅</p>
              <p className="font-medium">Mensagem enviada!</p>
              <p className="text-sm text-muted-foreground">Em breve nossa equipe entrará em contato.</p>
              <Button variant="outline" className="mt-2" onClick={() => setLeadOpen(false)}>Fechar</Button>
            </div>
          ) : (
            <form onSubmit={submitLead} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="lead-name">Nome</Label>
                <Input id="lead-name" name="name" placeholder="Seu nome completo" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-email">E-mail</Label>
                <Input id="lead-email" name="email" type="email" placeholder="voce@empresa.com" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-phone">Telefone <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                <Input id="lead-phone" name="phone" placeholder="+55 11 99999-9999" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-message">Mensagem <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                <Input id="lead-message" name="message" placeholder="Conte um pouco sobre sua situação..." />
              </div>
              <Button type="submit" className="w-full" disabled={leadLoading}>
                {leadLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
