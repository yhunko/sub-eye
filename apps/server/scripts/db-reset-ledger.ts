// Clear drizzle's applied-migration ledger so the v4 baseline is migration #0.
// Safe because 0000_v4_baseline.sql is idempotent: re-applying it is a no-op.
// Usage: bun run --cwd apps/server db:reset-ledger
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = neon(url);

const before = await sql
  .query("select count(*)::int as applied from drizzle.__drizzle_migrations")
  .catch(() => [{ applied: 0 }]);

console.log("applied migrations before reset:", before);

await sql.query("create schema if not exists drizzle");
await sql.query(
  "create table if not exists drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint)",
);
await sql.query("delete from drizzle.__drizzle_migrations");

console.log("ledger cleared");
