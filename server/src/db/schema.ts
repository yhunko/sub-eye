import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";
import { SubscriptionPeriod } from "shared";

export const subscriptionPeriodEnum = pgEnum("period", [
  SubscriptionPeriod.DAY,
  SubscriptionPeriod.WEEK,
  SubscriptionPeriod.MONTH,
  SubscriptionPeriod.YEAR,
]);

export const subscriptionActionEnum = pgEnum("subscription_action", [
  "created",
  "updated",
  "cancelled",
  "renewed",
  "deleted",
  "uncancelled",
]);

export const pushNotificationsTable = pgTable(
  "push_subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [uniqueIndex("unique_endpoint_idx").on(t.userId, t.endpoint)],
);

export const subscriptionsTable = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  cost: numeric("cost", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  every: integer("every").notNull().default(1),
  period: subscriptionPeriodEnum("period")
    .notNull()
    .default(SubscriptionPeriod.MONTH),
  autoPaid: boolean("auto_paid").notNull().default(false),
  category: text("category"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  qstashMessageId: text("qstash_message_id"),
  brandDomain: text("brand_domain"),
  paymentDate: timestamp("payment_date", {
    withTimezone: true,
    mode: "string",
  }).notNull(),
  willBeCancelledAt: timestamp("cancelled_at"),
});

export const subscriptionHistoryTable = pgTable(
  "subscription_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subscriptionId: uuid("subscription_id").references(
      () => subscriptionsTable.id,
      { onDelete: "set null" },
    ),
    userId: text("user_id").notNull(),
    action: subscriptionActionEnum("action").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("subscription_history_subscription_user_created_at_idx").on(
      table.subscriptionId,
      table.userId,
      table.createdAt,
    ),
  ],
);
