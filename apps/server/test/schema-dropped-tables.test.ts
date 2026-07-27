import { describe, expect, it } from "bun:test";
import * as schema from "../src/db/schema";

/**
 * Tables that have been dropped from the live database must not remain
 * declared in schema.ts. Drizzle diffs the schema module against its
 * snapshots, so a leftover declaration makes the next `db:generate` emit a
 * CREATE TABLE that silently resurrects a deliberately deleted table.
 *
 * `org_billing_accounts` was dropped by
 * drizzle/0011_drop_org_billing_accounts.sql — a file that was never
 * registered in drizzle/meta/_journal.json, which is why the drift went
 * unnoticed.
 */
const DROPPED_TABLE_EXPORTS = ["orgBillingAccountsTable"] as const;

describe("db/schema.ts", () => {
  for (const exportName of DROPPED_TABLE_EXPORTS) {
    it(`does not re-declare the dropped table export "${exportName}"`, () => {
      expect(Object.keys(schema)).not.toContain(exportName);
    });
  }

  it("still declares the tables v4 keeps", () => {
    // Sanity check: proves the assertion above is reading a real, populated
    // module rather than passing because the import resolved to nothing.
    const exportNames = Object.keys(schema);

    expect(exportNames).toContain("subscriptionsTable");
    expect(exportNames).toContain("subscriptionPricePhasesTable");
    expect(exportNames).toContain("categoriesTable");
  });
});
