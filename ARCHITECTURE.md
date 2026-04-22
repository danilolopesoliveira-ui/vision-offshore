# ARCHITECTURE.md — Vision Offshore

> Documento de referência técnica e decisões de arquitetura.
> Gerado em: 2026-04-21. Atualizar a cada entrega.

---

## 1. Resumo executivo

**Vision Offshore** é uma plataforma interna da Gennesys — escritório brasileiro especializado em estruturação e gestão de empresas offshore — construída para substituir planilhas dispersas. O sistema centraliza o ciclo de vida completo de clientes pessoa física e suas offshores: desde o processo de abertura (Kanban por etapas) até a gestão contínua de obrigações de compliance, contratos com a Gennesys, controle de inadimplência, envio de alertas por e-mail e armazenamento de documentos com rastreabilidade total.

O sistema é de uso **exclusivamente interno**. Três perfis de usuário operam a plataforma: `SUPER_ADMIN` (sócios, acesso total), `ADMIN` (gestores, configuram jurisdições e templates) e `OPERATOR` (operadores do dia a dia). Clientes finais não possuem acesso no MVP. Todo o fluxo de auth é controlado por um sistema de códigos de acesso de uso único gerados pelos sócios, garantindo que nenhum usuário externo consiga se registrar.

Os três princípios inegociáveis de design guiam cada decisão de UI: **Didática** (operador novo entende em 15 minutos), **Simples** (zero ruído visual, hierarquia clara) e **Moderno** (shadcn/ui, Inter, dark mode, animações discretas). Adicionalmente, a plataforma expõe uma rota pública `/simulador` — uma landing de simulação tributária comparativa Brasil vs. país destino — que captura leads para a equipe comercial da Gennesys.

---

## 2. Decisões de implementação

### D1 — Formato da chave ENCRYPTION_KEY
**Decisão:** a chave é gerada com `openssl rand -base64 32` (produz 32 bytes → 44 chars em base64). Armazenada em `ENCRYPTION_KEY` e lida como `Buffer.from(process.env.ENCRYPTION_KEY!, 'base64')`. Algoritmo AES-256-GCM; IV de 12 bytes aleatório por operação; formato armazenado `iv_b64:authtag_b64:ciphertext_b64`. Não usamos hex para evitar padding desnecessário.

**Por quê base64 e não hex:** 64 chars hex é mais fácil de digitar, mas base64 (44 chars) é o output natural do `openssl rand` e já é o padrão de chaves em variáveis de ambiente em serviços como AWS KMS e Vercel. Menos risco de erro de digitação.

### D2 — Padrão de resposta das Server Actions e API Routes
**Decisão:** Server Actions retornam `{ success: true, data: T } | { success: false, error: string }`. API Routes retornam JSON com status HTTP adequado: 200/201 sucesso com `{ data: T }`, 4xx/5xx com `{ error: { code: string, message: string, details?: unknown } }`. Nenhuma route lança exceção para o cliente — todas são `try/catch` internamente.

**Por quê não throw:** Next.js App Router trata erros não capturados em server actions de forma inconsistente entre versões; retorno explícito garante tipagem e previsibilidade nos `useFormState` e `useTransition` do cliente.

### D3 — Biblioteca Google Drive
**Decisão:** `googleapis` v143+ (cliente oficial Google). Autenticação via `JWT` de service account usando `GOOGLE_SERVICE_ACCOUNT_EMAIL` e `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`. O cliente é instanciado como singleton em `lib/drive.ts` com lazy initialization.

Cache de IDs de pasta: tabela `DriveFolder { id, path, driveId, updatedAt }` no Postgres. Antes de criar pasta, verifica cache; se miss, cria no Drive e salva. TTL implícito: nunca expira (pastas do Drive não movem sozinhas). Se o Drive retornar 404 em um driveId cacheado, recria e atualiza cache.

### D4 — Estratégia de revalidação Next.js
**Decisão:** `revalidatePath` para mutations simples (criar, editar, apagar). `revalidateTag` para dados compartilhados entre múltiplas rotas (ex: lista de clientes usada no dashboard e em `/clientes`). Tags definidas em `lib/cache-tags.ts` como constantes. Páginas de dashboard usam `export const revalidate = 60` (revalidação automática a cada 60s) como fallback para dados do calendário.

### D5 — Onde tratar timezone
**Decisão:** o banco armazena sempre em UTC. A conversão para `America/Sao_Paulo` ocorre **apenas na camada de apresentação** (`lib/utils.ts` → `formatDate`, `formatDateTime`). Os cálculos de datas de vencimento DCBE (ex: "05/04 do próximo ano") são calculados com `date-fns-tz` usando `zonedTimeToUtc('YYYY-04-05T23:59:59', 'America/Sao_Paulo')` antes do INSERT. Inputs de formulário com `<input type="date">` retornam strings `YYYY-MM-DD` interpretadas como "meia-noite BRT" e convertidas para UTC antes de salvar.

### D6 — Race conditions no motor DCBE
**Decisão:** o motor DCBE roda **dentro da transação Prisma** do UPDATE de `declaredWealthUsd`. Usa `prisma.$transaction([...], { isolationLevel: 'Serializable' })`. Idempotência garantida por: (1) cancelar TODAS as obrigações DCBE futuras pendentes antes de recriar; (2) o cron mensal `sync-dcbe` usa advisory lock do PostgreSQL: `SELECT pg_try_advisory_xact_lock(hashtext('dcbe-sync-' || clientId))` via `$executeRaw` antes de processar cada cliente. Se o lock falhar (outro processo já rodando), pula o cliente e loga um warning.

### D7 — Versionamento da view SQL em migrations
**Decisão:** a view `delinquency_view` é criada em uma migration raw separada: `prisma/migrations/YYYYMMDD_HHMMSS_add_delinquency_view/migration.sql`. Alterações futuras criam uma nova migration com `CREATE OR REPLACE VIEW`. A view nunca é gerenciada pelo schema Prisma — é DDL raw para manter controle total. O arquivo `prisma/views.sql` é a fonte de verdade; a migration é cópia fiel dele. O seed verifica a existência da view antes de consultar dados dela.

### D8 — Estratégia de teste do Google Drive
**Decisão:** mock completo em testes unitários e e2e. Em `tests/`, o módulo `lib/drive.ts` é substituído por um mock (`vi.mock('../../lib/drive')`) que retorna respostas fixas. **Não há conta de teste real do Drive** — o custo de setup de credenciais de service account em CI supera o benefício. A integração real é coberta por smoke tests manuais no ambiente de staging. Essa limitação está documentada como dívida técnica.

### D9 — Proteção do endpoint público do simulador
**Decisão MVP:** sem rate limit nem CAPTCHA. O simulador não persiste dados sensíveis (apenas o lead no CTA) e o cálculo é puramente local (sem chamadas externas). O endpoint `POST /api/simulador/lead` tem validação Zod rigorosa (email válido, campos obrigatórios, `payload` com tamanho máximo de 10KB via `z.string().max(10000)`). Rate limit será adicionado na v2 via Vercel Edge Middleware com `@upstash/ratelimit`. Risco mitigado: o simulador não expõe dados internos.

### D10 — Estratégia de upload (tamanho e multipart)
**Decisão:** uploads enviados via `POST /api/upload` como `multipart/form-data`. Limite: **20MB por arquivo** (configurado em `next.config.js` com `api.bodyParser: false` + leitura manual do stream). Tipos aceitos: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`. Validação de MIME type no servidor via `magic bytes` (primeiros bytes do buffer), não apenas extensão. Para arquivos >20MB (edge case), instruir operador a fazer upload direto no Drive e colar o link manualmente — fora do escopo v1.

### D11 — AlertLog para deduplicação de e-mails
**Decisão:** adicionar model `AlertLog` no schema Prisma ao invés de array no `Obligation` (evita schema inflation). Campos: `id, obligationId, daysBefore, sentAt`. Índice único em `(obligationId, daysBefore)`. O cron verifica existência antes de enviar. Isso mantém `Obligation` enxuto e o log consultável.

### D12 — `totalDeclaredWealthUsd` vs. soma automática
**Decisão:** `IndividualClient.totalDeclaredWealthUsd` é um campo **editável manualmente** pelo operador (não calculado automaticamente como soma das offshores). O motor DCBE soma esse campo com `declaredWealthUsd` de todas as offshores ativas, conforme o pseudo-código do spec. Isso permite que o cliente declare patrimônio em ativos que não são offshores geridas pela Gennesys. Documentado na UI com tooltip explicativo.

### D13 — Componentes Shadcn instalados antecipadamente vs. sob demanda
**Decisão:** no scaffold (Entrega 1), instalar via CLI os componentes que CERTAMENTE serão usados em múltiplas telas: `button`, `card`, `input`, `label`, `select`, `textarea`, `dialog`, `sheet`, `form`, `badge`, `skeleton`, `separator`, `tabs`, `tooltip`, `dropdown-menu`, `avatar`, `scroll-area`, `switch`, `checkbox`, `popover`, `command`. Componentes mais específicos (`calendar`, `data-table`, `toast`) instalados na entrega que os introduz.

---

## 3. Estrutura de pastas final

```
vision-offshore/
├── .vscode/
│   ├── settings.json          # formatOnSave, tailwind, prisma, eslint
│   ├── extensions.json        # recomendações
│   └── tasks.json             # dev, test, seed, migrate
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (protected)/
│   │   ├── layout.tsx                 # sidebar + topbar + providers
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   ├── loading.tsx
│   │   │   └── inadimplencia/
│   │   │       ├── page.tsx
│   │   │       └── loading.tsx
│   │   ├── clientes/
│   │   │   ├── page.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── novo/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── offshores/
│   │   │           ├── nova/
│   │   │           │   └── page.tsx
│   │   │           └── [oid]/
│   │   │               └── page.tsx
│   │   ├── abertura/
│   │   │   ├── page.tsx
│   │   │   ├── nova/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   └── admin/
│   │       ├── page.tsx
│   │       ├── jurisdicoes/
│   │       │   ├── page.tsx
│   │       │   └── [id]/
│   │       │       └── page.tsx
│   │       ├── prestadores/
│   │       │   └── page.tsx
│   │       ├── usuarios/
│   │       │   └── page.tsx
│   │       ├── simulador/
│   │       │   ├── page.tsx
│   │       │   ├── [id]/
│   │       │   │   └── page.tsx
│   │       │   └── leads/
│   │       │       └── page.tsx
│   │       └── auditoria/
│   │           └── page.tsx
│   ├── simulador/
│   │   └── page.tsx                   # PÚBLICA — sem auth
│   ├── api/
│   │   ├── cron/
│   │   │   ├── extend-recurrences/
│   │   │   │   └── route.ts
│   │   │   ├── send-alerts/
│   │   │   │   └── route.ts
│   │   │   └── sync-dcbe/
│   │   │       └── route.ts
│   │   ├── upload/
│   │   │   └── route.ts
│   │   └── simulador/
│   │       ├── calcular/
│   │       │   └── route.ts
│   │       └── lead/
│   │           └── route.ts
│   ├── layout.tsx                     # root: html, body, ThemeProvider
│   └── globals.css
├── actions/                           # Server Actions (mutations)
│   ├── clients.ts
│   ├── offshores.ts
│   ├── obligations.ts
│   ├── opening.ts
│   ├── admin.ts
│   └── simulator.ts
├── components/
│   ├── ui/                            # shadcn (CLI-managed)
│   ├── calendar/
│   │   ├── ObligationCalendar.tsx
│   │   └── ObligationDrawer.tsx
│   ├── kanban/
│   │   ├── OpeningKanban.tsx
│   │   ├── KanbanColumn.tsx
│   │   └── KanbanCard.tsx
│   ├── forms/
│   │   ├── IndividualClientForm.tsx
│   │   ├── OffshoreCompanyForm.tsx
│   │   ├── JointTenantsField.tsx
│   │   ├── GennesysContractForm.tsx
│   │   └── UploadField.tsx
│   ├── charts/
│   │   ├── DelinquencyChart.tsx
│   │   └── MonthlyProjectionDonut.tsx
│   ├── shared/
│   │   ├── AppSidebar.tsx
│   │   ├── AppTopbar.tsx
│   │   ├── Breadcrumbs.tsx
│   │   ├── DataTable.tsx              # wrapper @tanstack/react-table
│   │   ├── EmptyState.tsx
│   │   ├── StatusBadge.tsx
│   │   └── ThemeToggle.tsx
│   └── simulator/
│       ├── SimulatorStepper.tsx
│       ├── SimulatorFormPJ.tsx
│       ├── SimulatorFormPF.tsx
│       ├── ResultComparison.tsx
│       └── LeadCaptureModal.tsx
├── lib/
│   ├── db.ts                          # Prisma singleton
│   ├── auth.ts                        # helpers Supabase SSR
│   ├── drive.ts                       # Google Drive API
│   ├── storage.ts                     # uploadDocument (Drive + Supabase)
│   ├── crypto.ts                      # AES-256-GCM
│   ├── dcbe.ts                        # motor DCBE
│   ├── obligations.ts                 # geração de recorrências
│   ├── email.ts                       # Resend sender
│   ├── alerts.ts                      # lógica de alertas escalonados
│   ├── audit.ts                       # logAudit + withAudit wrapper
│   ├── cache-tags.ts                  # constantes de revalidateTag
│   ├── tax/
│   │   ├── brazil-pj.ts
│   │   ├── brazil-pf.ts
│   │   ├── foreign-pj.ts
│   │   ├── foreign-pf.ts
│   │   └── simulator.ts              # orquestrador
│   └── utils.ts                       # cn(), formatDate(), formatCurrency()
├── emails/
│   ├── ObligationAlert.tsx
│   └── WelcomeAccessCode.tsx
├── hooks/                             # custom React hooks client-side
│   ├── use-debounce.ts
│   └── use-copy-to-clipboard.ts
├── types/
│   └── index.ts                       # tipos globais (ex: DelinquencyRow, SimResult)
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   ├── views.sql                      # fonte de verdade da view
│   └── seed.ts
├── tests/
│   ├── unit/
│   │   ├── delinquency.test.ts
│   │   ├── dcbe.test.ts
│   │   ├── joint-tenants.test.ts
│   │   ├── obligations-recurrence.test.ts
│   │   └── simulator-brazil-pj.test.ts
│   └── e2e/
│       ├── auth.spec.ts
│       ├── client-crud.spec.ts
│       └── simulator-public.spec.ts
├── public/
│   └── empty-states/                  # SVGs inline exportados como componentes
├── middleware.ts
├── .env.example
├── .env.local                         # gitignored
├── .gitignore
├── ARCHITECTURE.md
├── README.md
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── vercel.json
├── components.json                    # config shadcn
├── prettier.config.js
├── eslint.config.js
├── vitest.config.ts
└── playwright.config.ts
```

**Justificativas de refinamento:**
- Adicionei `actions/` como pasta de topo (não dentro de `app/`) para separar claramente Server Actions de route handlers — Actions são chamadas de componentes, Routes são chamadas HTTP externas.
- Adicionei `hooks/` para custom hooks reutilizáveis (debounce para buscas, copy-to-clipboard para credenciais).
- Adicionei `abertura/nova/page.tsx` para o formulário de criação de processo de abertura (o spec menciona fluxo separado em 6.8).
- Separei `storage.ts` de `drive.ts`: `drive.ts` é o cliente puro do Google Drive; `storage.ts` é o orquestrador que coordena Drive + Supabase + criação do `DocumentAsset` no banco.

---

## 4. Dependências npm completas

### Produção

| Pacote | Versão mínima | Justificativa |
|---|---|---|
| `next` | 14.2 | Framework principal, App Router |
| `react` / `react-dom` | 18.3 | Runtime React |
| `typescript` | 5.4 | Dev dep — strict mode |
| `@prisma/client` | 5.10 | ORM client |
| `prisma` | 5.10 | Dev dep — CLI migrations |
| `@supabase/supabase-js` | 2.43 | SDK Supabase (auth + storage) |
| `@supabase/ssr` | 0.3 | Helpers SSR para Next.js App Router |
| `tailwindcss` | 3.4 | CSS utility framework |
| `postcss` | 8.4 | Pipeline CSS |
| `autoprefixer` | 10.4 | Prefixos CSS cross-browser |
| `tailwind-merge` | 2.3 | Merge condicional de classes Tailwind |
| `clsx` | 2.1 | Conditionals de classes (usado pelo shadcn) |
| `class-variance-authority` | 0.7 | Variantes de componentes shadcn |
| `lucide-react` | 0.378 | Ícones |
| `framer-motion` | 11.1 | Animações discretas |
| `@tanstack/react-table` | 8.16 | Tabelas headless |
| `@hello-pangea/dnd` | 4.0 | Drag-and-drop Kanban |
| `@fullcalendar/react` | 6.1 | Calendário React |
| `@fullcalendar/daygrid` | 6.1 | Plugin vista mensal |
| `@fullcalendar/interaction` | 6.1 | Plugin click/drag em eventos |
| `recharts` | 2.12 | Gráficos (donut, barras) |
| `react-hook-form` | 7.51 | Gerenciamento de forms |
| `@hookform/resolvers` | 3.3 | Bridge RHF + Zod |
| `zod` | 3.23 | Validação e inferência de tipos |
| `date-fns` | 3.6 | Manipulação de datas |
| `date-fns-tz` | 3.1 | Timezone América/São Paulo |
| `sonner` | 1.4 | Toast notifications |
| `resend` | 3.2 | SDK Resend para envio de e-mail |
| `@react-email/components` | 0.0.19 | Componentes de e-mail React |
| `googleapis` | 143 | SDK oficial Google (Drive v3) |
| `bcryptjs` | 2.4 | Hash de códigos de acesso |
| `nanoid` | 5.0 | CUID alternativo quando necessário |
| `next-themes` | 0.3 | Dark/light mode com SSR |

### Dev / Tooling

| Pacote | Versão | Justificativa |
|---|---|---|
| `eslint` | 8.57 | Linting |
| `eslint-config-next` | 14.2 | Regras Next.js |
| `@typescript-eslint/parser` | 7.7 | Parser TS para ESLint |
| `@typescript-eslint/eslint-plugin` | 7.7 | Regras TS |
| `prettier` | 3.2 | Formatação |
| `prettier-plugin-tailwindcss` | 0.5 | Ordena classes Tailwind |
| `vitest` | 1.5 | Test runner (unit) |
| `@vitejs/plugin-react` | 4.2 | Plugin React para Vitest |
| `@testing-library/react` | 15.0 | Helpers de teste |
| `@testing-library/jest-dom` | 6.4 | Matchers DOM |
| `@playwright/test` | 1.43 | E2E tests |

**Total produção: ~31 pacotes.** Nenhum fora do spec original — todos justificados. shadcn/ui não é dependência direta (copiado via CLI).

---

## 5. Cronograma estimado

| # | Entrega | Dias úteis | Acumulado |
|---|---|---|---|
| 1 | Scaffold: Next.js + TS + Tailwind + shadcn + ESLint + Prettier + .vscode + Vitest + Playwright setup | 0.5 | 0.5 |
| 2 | Prisma schema + migration + view SQL + seed básico (super-admin + código) | 0.5 | 1 |
| 3 | Fundações: `lib/crypto.ts`, `db.ts`, `drive.ts`, `storage.ts`, `audit.ts` | 1 | 2 |
| 4 | Auth Supabase + middleware + login/signup com código de acesso | 1 | 3 |
| 5 | Layout base: sidebar, topbar, breadcrumbs, dark/light toggle, drawer mobile | 1 | 4 |
| 6 | `lib/obligations.ts` + `lib/dcbe.ts` + todos os testes unitários passando | 1.5 | 5.5 |
| 7 | CRUD PF: lista, criar, editar, perfil com tabs | 1.5 | 7 |
| 8 | CRUD Offshore + JointTenants + validação 100% | 1.5 | 8.5 |
| 9 | Admin: jurisdições + templates + prestadores + usuários | 1.5 | 10 |
| 10 | Dashboard: calendário + drawer + inadimplência card + KPI cards | 2 | 12 |
| 11 | Kanban de abertura: 4 etapas + drag-and-drop + validação de etapa | 1.5 | 13.5 |
| 12 | `lib/tax/*` + simulador público + admin simulador + leads | 2 | 15.5 |
| 13 | Resend + templates e-mail + crons configurados | 1 | 16.5 |
| 14 | Auditoria completa + hardening (upload MIME check, permissões) | 1 | 17.5 |
| 15 | Seeds completos (9 países, 2 PFs, offshores, obrigações) + testes e2e | 1 | 18.5 |
| 16 | README final + ARCHITECTURE.md atualizado + smoke tests | 0.5 | 19 |

**Total estimado: 19 dias úteis** (~4 semanas com margem de revisão).

---

## 6. Riscos conhecidos e mitigações

### Risco 1 — Google Drive API: cotas e latência
**Risco:** a API do Drive tem cota de 10.000 req/100s por usuário. Uploads simultâneos podem causar `429 Too Many Requests`. Latência de rede adicionada a cada upload.

**Mitigação:** cache de IDs de pasta (D3) elimina chamadas redundantes de `files.list`. Para `429`, implementar retry com exponential backoff (3 tentativas). Timeout máximo de 30s no upload (configurado no `googleapis`). Monitorar via Vercel Analytics.

### Risco 2 — Cron de alertas e falha de entrega do Resend
**Risco:** o Resend pode estar down ou retornar erro transiente. E-mails críticos (vencimento = hoje) não seriam entregues.

**Mitigação:** o cron verifica a tabela `AlertLog` para idempotência — se o cron roda novamente (retry do Vercel), não reenvia. Logar erros do Resend no `AuditLog` com `action=EMAIL_FAILED`. Monitorar no dashboard do Resend. Retry manual via endpoint admin fora do escopo v1.

### Risco 3 — DCBE: vinculação à "offshore principal"
**Risco:** o DCBE é legalmente uma obrigação da PF, mas o sistema a vincula à offshore mais antiga ativa. Se essa offshore for encerrada, a obrigação fica órfã.

**Mitigação:** ao encerrar uma offshore (`status=CLOSED`), reatribuir obrigações DCBE futuras para a próxima offshore ativa mais antiga. Documentado como TODO v2 para criar uma entidade `PfObligation` independente de offshore.

### Risco 4 — Supabase Auth + Prisma: dessincronia de usuários
**Risco:** usuário criado no Supabase Auth mas falha ao criar `User` no Postgres (problema de rede, timeout). Usuário consegue logar mas não tem perfil.

**Mitigação:** no signup via código de acesso, usar `supabase.auth.signUp` seguido de insert no Postgres dentro de um try/catch. Se o insert falhar, chamar `supabase.auth.admin.deleteUser(uid)` para rollback. Middleware verifica existência do `User` no Postgres além da sessão Supabase — redireciona para tela de erro com instrução de contatar suporte.

### Risco 5 — Simulador tributário: outdatedness
**Risco:** alíquotas mudam. O config JSON no admin pode ficar desatualizado e o simulador dar números errados, gerando passivo jurídico para a Gennesys.

**Mitigação:** disclaimer obrigatório em todas as telas de resultado. Campo `sourcesNotes` e `updatedAt` visíveis no resultado público ("Dados atualizados em DD/MM/AAAA"). Admin recebe alerta visual se `updatedAt` > 90 dias. Treinamento para a equipe atualizar antes de cada mudança legislativa relevante.

### Risco 6 — Race condition em recorrências
**Risco:** o cron de extensão de recorrências roda enquanto um operador está criando uma nova obrigação recorrente. Podem surgir instâncias duplicadas.

**Mitigação:** advisory lock por `recurrenceGroupId` no cron (D6). A criação inicial de recorrências usa uma transação atômica. Índice único implícito na combinação `(recurrenceGroupId, dueDateOriginal)` — adicionar via migration para garantia no banco.

### Risco 7 — Tamanho de payload do simulador no SimulatorLead
**Risco:** o campo `payload` armazena o cenário completo; payloads malformados ou anormalmente grandes podem degradar a tabela.

**Mitigação:** validação Zod no endpoint `POST /api/simulador/lead` limita o payload serializado a 10KB (D9). Schema do Zod descreve a estrutura esperada, não aceita campos extras (`z.strict()`).

---

## 7. Dívidas técnicas documentadas (v1 → v2)

1. **Rotação de chave AES-256** — sem mecanismo de re-criptografia em massa; chave é única e sem versão ativa no MVP.
2. **DCBE como entidade PF** — hoje vinculado a offshore; v2 cria `PfObligation` independente.
3. **Real-time** — sem WebSockets; mudanças de outros operadores exigem reload manual.
4. **Rate limiting no simulador** — v2 via Vercel Edge + Upstash Redis.
5. **Auditoria de leitura** — auditamos writes; reads sensíveis (credenciais) são logados mas downloads de documentos não.
6. **Testes de integração Drive** — mockados; smoke tests manuais em staging.
7. **Internacionalização** — apenas pt-BR hardcoded.
8. **Soft delete** — sem `deletedAt`; deleção permanente com AuditLog.
9. **Lei 14.754/2023 (CFC)** — o simulador exibe aviso textual mas não calcula o impacto; cálculo correto exige dados patrimoniais detalhados.

---

## 8. Descobertas do scaffold (Entrega 1) — Breaking changes

### Next.js 16.2.4 (em vez de 14.2 do spec)
`create-next-app` instalou o latest (v16). Mudanças relevantes vs. v14:
- `middleware.ts` → **`proxy.ts`** (renomeado; mesma API `NextRequest`/`NextResponse`, função exportada como `proxy` em vez de `middleware`)
- Turbopack agora é default no dev server; `next.config.ts` precisa de `turbopack.root` para evitar warning em monorepos

### Prisma 7.7.0 (em vez de 5.10 do spec)
Breaking changes significativos:
- **`url` e `directUrl` removidos do `schema.prisma`** — agora configurados em `prisma.config.ts` (arquivo raiz)
- `PrismaClient` lê `DATABASE_URL` do env automaticamente; não aceita `datasourceUrl` no constructor
- `directUrl` não existe mais em `prisma.config.ts` — apenas `url` e `shadowDatabaseUrl`
- Gerar o client: `npx prisma generate` (lê `prisma.config.ts`)

### `@react-email/components` deprecado
Substituído por `react-email` (v6). Templates de e-mail importam de `react-email` diretamente.

### Prisma 7 requer driver adapter (`@prisma/adapter-pg`)
Em Prisma 7, o engine "library" foi removido. `PrismaClient` exige um driver adapter. Para Supabase PostgreSQL:
- Instalar `@prisma/adapter-pg` e `pg`
- Criar `PrismaPg` com `connectionString` e passar como `adapter` para `PrismaClient`
- `lib/db.ts` usa inicialização lazy para não quebrar no build sem `DATABASE_URL`
- `Resend` também é lazy (idem — não inicializar no module-level, só quando `sendEmail` é chamado)

### `brazil-pj.ts` — effectiveRate para Lucro Real
Para Lucro Real, `effectiveRate = (IRPJ + CSLL) / annualProfit` (impostos sobre renda / lucro).
PIS/COFINS são impostos indiretos sem equivalente no exterior — incluídos no `breakdown` e `totalTaxBRL` mas excluídos do `effectiveRate` para comparação cross-country ter sentido.
