// One-off: copy each existing user's Clerk publicMetadata into their `users`
// row. Idempotent — re-running it just rewrites the same values.
// Usage: bun run --cwd apps/server db:backfill-users
import { clerkClient } from "@clerk/express";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
if (!process.env.CLERK_SECRET_KEY) {
  console.error("CLERK_SECRET_KEY is not set");
  process.exit(1);
}

const sql = neon(url);
const rows = (await sql.query("select id from users")) as Array<{ id: string }>;

console.log(`backfilling ${rows.length} user(s) from Clerk`);

const str = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;

for (const { id } of rows) {
  try {
    const user = await clerkClient.users.getUser(id);
    const meta = (user.publicMetadata ?? {}) as Record<string, unknown>;

    await sql.query(
      `update users
          set preferred_currency = $2,
              timezone           = $3,
              date_format        = $4,
              locale             = $5,
              updated_at         = now()
        where id = $1`,
      [
        id,
        str(meta.preferredCurrency, "uah").toLowerCase(),
        str(meta.preferredTimezone, "UTC"),
        str(meta.preferredDateFormat, "DD/MM/YYYY"),
        str(meta.locale, "en"),
      ],
    );

    console.log(`  ok  ${id}`);
  } catch (error) {
    // A user deleted in Clerk but still referenced by rows keeps its defaults.
    console.warn(
      `  skip ${id}:`,
      error instanceof Error ? error.message : error,
    );
  }
}

console.log("done");
