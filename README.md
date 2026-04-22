# Vision Offshore

Internal SaaS for Gennesys — offshore structure management, client tracking, and tax simulation.

## Stack

- **Next.js** (App Router) + TypeScript
- **Prisma 7** + PostgreSQL (Supabase)
- **Supabase Auth** (`@supabase/ssr`)
- **Tailwind CSS** + shadcn/ui
- **Vitest** (unit) + **Playwright** (e2e)

---

## Prerequisites

- Node.js 20+
- A Supabase project (free tier works)
- PostgreSQL connection string from Supabase

---

## Environment variables

Create a `.env.local` file at the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Database (use the "Transaction" pooler URL for serverless)
DATABASE_URL=postgresql://postgres:<password>@<host>:5432/postgres

# Encryption key for service-provider credentials (AES-256-GCM)
# Generate with: openssl rand -hex 32
ENCRYPTION_KEY=<64-char hex string>

# Email (optional — for future notifications)
RESEND_API_KEY=re_...

# Google Drive service account (optional — for document storage)
GOOGLE_SERVICE_ACCOUNT_EMAIL=vision@<project>.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_FOLDER_ID=<folder-id>
```

### Where to find Supabase values

1. **Project Settings → API** in the Supabase dashboard
2. **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
3. **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **service_role secret** key → `SUPABASE_SERVICE_ROLE_KEY`
5. **Project Settings → Database → Connection string → Transaction** → `DATABASE_URL`

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npm run db:generate

# 3. Run migrations (creates all tables)
npm run db:migrate

# 4. (Optional) Seed reference data
npm run db:seed

# 5. Start development server
npm run dev
```

The app is available at `http://localhost:3000`.

---

## First user

Create the first user directly in Supabase Auth (**Authentication → Users → Invite user**), then promote to `SUPER_ADMIN`:

```sql
UPDATE "User" SET role = 'SUPER_ADMIN' WHERE email = 'your@email.com';
```

After that, use **Admin → Usuários → Gerar código de acesso** to invite additional users.

---

## Delinquency view (Dashboard)

The dashboard delinquency table requires a SQL view. Run once in the Supabase SQL editor:

```sql
CREATE OR REPLACE VIEW delinquency_view AS
SELECT
  o.id AS obligation_id,
  of.name AS offshore_name,
  ic.name AS client_name,
  o.nature,
  COALESCE(o."dueDateAdjusted", o."dueDateOriginal") AS due_date,
  CURRENT_DATE - COALESCE(o."dueDateAdjusted", o."dueDateOriginal")::date AS days_overdue
FROM "Obligation" o
JOIN "Offshore" of ON of.id = o."offshoreId"
JOIN "IndividualClient" ic ON ic.id = of."individualClientId"
WHERE o.status = 'PENDING'
  AND COALESCE(o."dueDateAdjusted", o."dueDateOriginal") < CURRENT_DATE;
```

---

## Running tests

```bash
# Unit tests
npm test

# Unit tests in watch mode
npm run test:watch

# E2e tests (requires running dev server or set PLAYWRIGHT_BASE_URL)
npm run test:e2e

# E2e with interactive UI
npm run test:e2e:ui
```

---

## Key scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed reference data |
| `npm test` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright e2e tests |
| `npm run lint` | ESLint check |
| `npm run format` | Prettier format |

---

## Roles

| Role | Access |
|---|---|
| `USER` | All protected pages |
| `ADMIN` | + Admin panel (jurisdictions, templates, providers, simulator, audit) |
| `SUPER_ADMIN` | + User management, access code generation |

---

## Architecture notes

- **`proxy.ts`** — Session verification + role guards before every request (Next.js middleware)
- **`lib/crypto.ts`** — AES-256-GCM encryption for service provider credentials; requires `ENCRYPTION_KEY`
- **`lib/tax/`** — Pure functions for Brazil PJ/PF tax calculation and foreign jurisdiction simulation
- **`lib/obligations.ts`** — Instantiates jurisdiction obligations when a new offshore entity is created
- **`withAudit()`** — Wraps all mutations to write to `AuditLog` automatically
- Server Actions live in `app/actions/` and are called from Client Components via `useActionState` / `useTransition`
