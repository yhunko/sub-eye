// Runs against a live database. Skipped unless PARITY_DATABASE_URL is set:
//   PARITY_DATABASE_URL=<branch url> bun test ./test/status-backfill-parity.test.ts
//
// HISTORICAL. It checked the one-off v4 `status` backfill, which has since run
// on every branch. `deriveSubscriptionStatus` is called here without a timezone,
// so it answers on the UTC day while the services that maintain the column now
// answer on the account's — expect a mismatch for any row sitting exactly on a
// transition day. That is drift in this test's premise, not in the column.

import { describe, expect, it } from "bun:test";
import { neon } from "@neondatabase/serverless";
import { deriveSubscriptionStatus } from "@subeye/shared";

const url = process.env.PARITY_DATABASE_URL;

// `cancelled_at` is a naive (no-tz) column written from JS as UTC. The
// neon-http `query()` path decodes it into a JS Date (naive digits read as
// UTC), while a string can arrive as "2026-05-16 17:18:27.409" or already
// "...Z". Normalize every form to a Z-suffixed ISO instant, never double-Z.
const normalizeNaiveUtc = (value: unknown): string | null => {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const withT = String(value).replace(" ", "T");
  return withT.endsWith("Z") ? withT : `${withT}Z`;
};

describe.skipIf(!url)("status backfill parity", () => {
  it("matches deriveSubscriptionStatus for every migrated row", async () => {
    const sql = neon(url as string);
    const rows = (await sql.query(
      "select id, status, cancelled_at, paused_at, resume_at from subscriptions order by id",
    )) as Array<{
      id: string;
      status: string;
      cancelled_at: string | Date | null;
      paused_at: string | Date | null;
      resume_at: string | Date | null;
    }>;

    expect(rows.length).toBeGreaterThan(0);

    const mismatches = rows.filter((row) => {
      const expected = deriveSubscriptionStatus({
        willBeCancelledAt: normalizeNaiveUtc(row.cancelled_at),
        pausedAt: normalizeNaiveUtc(row.paused_at),
        resumeAt: normalizeNaiveUtc(row.resume_at),
      });

      return expected !== row.status;
    });

    expect(mismatches).toEqual([]);
  });

  it("leaves no row with a status outside the enum", async () => {
    const sql = neon(url as string);
    const rows = (await sql.query(
      "select distinct status from subscriptions",
    )) as Array<{ status: string }>;

    for (const row of rows) {
      expect(["active", "paused", "cancelling", "cancelled"]).toContain(
        row.status,
      );
    }
  });
});
