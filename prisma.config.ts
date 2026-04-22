import { defineConfig } from "prisma/config";

// In local dev, load vars from .env.local before running Prisma CLI commands:
//   node --env-file=.env.local node_modules/.bin/prisma db push
// In production (Render, Vercel, etc.) env vars are injected by the platform.

export default defineConfig({
  datasource: {
    // Use direct URL (port 5432) for CLI ops — PgBouncer (port 6543) breaks db push/migrations
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
});
