import { describe, expect, it } from "bun:test";
import { is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import * as schema from "../src/db/schema";
import {
  categoriesTable,
  fxRatesTable,
  subscriptionPricePhasesTable,
  subscriptionsTable,
  usersTable,
} from "../src/db/schema";

const sqlColumnNames = (table: PgTable) =>
  getTableConfig(table)
    .columns.map((column) => column.name)
    .sort();

describe("v4 database schema shape", () => {
  it("declares exactly the five v4 tables", () => {
    // `is(value, PgTable)` is drizzle's runtime brand check — it filters out the
    // pgEnum exports, which are also plain objects.
    const tableNames = Object.values(schema)
      .filter((value): value is PgTable => is(value, PgTable))
      .map((table) => getTableConfig(table).name)
      .sort();

    expect(tableNames).toEqual([
      "categories",
      "fx_rates",
      "subscription_price_phases",
      "subscriptions",
      "users",
    ]);
  });

  it("gives subscriptions exactly the v4 column set", () => {
    expect(sqlColumnNames(subscriptionsTable)).toEqual([
      "auto_paid",
      "brand_domain",
      "cancelled_at",
      "category_id",
      "cost",
      "created_at",
      "currency",
      "every",
      "id",
      "name",
      "notes",
      "paused_at",
      "payment_date",
      "period",
      "resume_at",
      "status",
      "updated_at",
      "user_id",
    ]);
  });

  it("has dropped every legacy column from subscriptions", () => {
    const dropped = [
      "org_id",
      "scheduled_cost",
      "scheduled_currency",
      "scheduled_effective_at",
      "qstash_message_id",
      "cancellation_qstash_message_id",
      "price_change_qstash_message_id",
    ];
    const present = sqlColumnNames(subscriptionsTable);

    for (const column of dropped) {
      expect(present).not.toContain(column);
    }
  });

  it("has dropped org_id and qstash_message_id from price phases", () => {
    const present = sqlColumnNames(subscriptionPricePhasesTable);

    expect(present).not.toContain("org_id");
    expect(present).not.toContain("qstash_message_id");
  });

  it("has dropped org_id from categories", () => {
    expect(sqlColumnNames(categoriesTable)).not.toContain("org_id");
  });

  it("gives users the five preference columns plus timestamps", () => {
    expect(sqlColumnNames(usersTable)).toEqual([
      "created_at",
      "date_format",
      "id",
      "locale",
      "preferred_currency",
      "theme",
      "timezone",
      "updated_at",
    ]);
  });

  it("gives fx_rates a base-keyed rate document", () => {
    expect(sqlColumnNames(fxRatesTable)).toEqual([
      "base",
      "fetched_at",
      "rate_date",
      "rates",
    ]);
  });
});
