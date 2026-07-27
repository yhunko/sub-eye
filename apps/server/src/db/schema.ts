import { SubscriptionPeriod, subscriptionStatuses } from "@subeye/shared";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const subscriptionPeriodEnum = pgEnum("period", [
  SubscriptionPeriod.DAY,
  SubscriptionPeriod.WEEK,
  SubscriptionPeriod.MONTH,
  SubscriptionPeriod.YEAR,
]);

export const pricePhaseKindEnum = pgEnum("price_phase_kind", [
  "trial",
  "intro",
  "scheduledChange",
  "standard",
]);

/**
 * Persisted lifecycle status. Before v4 this was derived in JS on every read
 * from `subscriptions.cancelled_at`, which made SQL-side filtering impossible.
 * The member order must match `subscriptionStatuses` in @subeye/shared.
 */
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  ...subscriptionStatuses,
]);

/**
 * User preferences, keyed by Clerk user id. Before v4 these lived in Clerk
 * `publicMetadata`, so every request needing a timezone made an external Clerk
 * round-trip — and the metadata reader could issue a *write* back to Clerk
 * during a plain read. Clerk remains the identity provider; it is no longer the
 * preference store.
 */
export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  preferredCurrency: text("preferred_currency").notNull().default("uah"),
  timezone: text("timezone").notNull().default("UTC"),
  dateFormat: text("date_format").notNull().default("DD/MM/YYYY"),
  locale: text("locale").notNull().default("en"),
  theme: text("theme").notNull().default("system"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const categoriesTable = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    emoji: text("emoji").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("categories_user_id_idx").on(table.userId)],
);

export const subscriptionsTable = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    cost: numeric("cost", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull(),
    every: integer("every").notNull().default(1),
    period: subscriptionPeriodEnum("period")
      .notNull()
      .default(SubscriptionPeriod.MONTH),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    autoPaid: boolean("auto_paid").notNull().default(false),
    categoryId: uuid("category_id").references(() => categoriesTable.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    brandDomain: text("brand_domain"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    paymentDate: timestamp("payment_date", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    // NOTE: the SQL column is `cancelled_at`, the property is `willBeCancelledAt`.
    // It is a naive timestamp — compare it against `now() at time zone 'utc'`.
    // Kept in v4: `status = 'cancelling'` needs the date the period ends.
    willBeCancelledAt: timestamp("cancelled_at"),
    pausedAt: timestamp("paused_at", { withTimezone: true, mode: "string" }),
    resumeAt: timestamp("resume_at", { withTimezone: true, mode: "string" }),
  },
  (t) => [
    index("subscriptions_user_id_idx").on(t.userId),
    index("subscriptions_user_status_idx").on(t.userId, t.status),
  ],
);

/**
 * A subscription's price over time, as ordered windows. The subscription row's
 * own cost/currency stay authoritative for "what you pay now"; phases describe
 * the transitions around it. `appliedAt` is set when the boundary fired and the
 * price was copied onto the subscription row — `null` means pending.
 */
export const subscriptionPricePhasesTable = pgTable(
  "subscription_price_phases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptionsTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    kind: pricePhaseKindEnum("kind").notNull(),
    cost: numeric("cost", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull(),
    startsAt: timestamp("starts_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true, mode: "string" }),
    appliedAt: timestamp("applied_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("price_phases_subscription_idx").on(t.subscriptionId),
    index("price_phases_user_idx").on(t.userId),
    index("price_phases_subscription_starts_at_idx").on(
      t.subscriptionId,
      t.startsAt,
    ),
  ],
);

/**
 * Daily FX snapshot, one row per base currency. `rates` maps a lowercase
 * currency code to "how many units of that code equal one unit of `base`".
 * Refreshed by the Worker cron from a pinned CDN build — no request ever waits
 * on an external fetch.
 */
export const fxRatesTable = pgTable("fx_rates", {
  base: text("base").primaryKey(),
  rates: jsonb("rates").$type<Record<string, number>>().notNull(),
  rateDate: text("rate_date").notNull(),
  fetchedAt: timestamp("fetched_at", {
    withTimezone: true,
    mode: "string",
  })
    .notNull()
    .defaultNow(),
});
