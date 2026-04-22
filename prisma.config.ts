import { defineConfig } from "prisma/config";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local for Prisma CLI (Next.js uses .env.local, not .env)
config({ path: resolve(process.cwd(), ".env.local") });

// Prisma 7: CLI connection config (migrations, introspection, studio)
// The PrismaClient at runtime reads DATABASE_URL directly from env.
export default defineConfig({
  datasource: {
    // Use direct URL (port 5432) for CLI ops — PgBouncer (port 6543) breaks db push/migrations
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
});
