// Run a single SQL statement against DATABASE_URL and print the rows as JSON.
// Usage: bun run --cwd apps/server db:sql "select count(*) from subscriptions"
// Override the target database with DATABASE_URL=... in front of the command.
import { neon } from "@neondatabase/serverless";

const statement = process.argv.slice(2).join(" ").trim();

if (!statement) {
  console.error('usage: db:sql "<single SQL statement>"');
  process.exit(1);
}

const url = process.env.DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = neon(url);
const rows = await sql.query(statement);

console.log(JSON.stringify(rows, null, 2));
