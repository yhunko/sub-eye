import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { SubscriptionPeriod } from "@shared/types";

export const subscriptionPeriodEnum = pgEnum("period", [
  SubscriptionPeriod.DAY,
  SubscriptionPeriod.WEEK,
  SubscriptionPeriod.MONTH,
  SubscriptionPeriod.YEAR,
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
  paymentDate: timestamp("payment_date", {
    withTimezone: true,
    mode: "string",
  }).notNull(),
  autoPaid: boolean("auto_paid").notNull().default(false),
  category: text("category"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  qstashMessageId: text("qstash_message_id"),
  brandDomain: text("brand_domain"),
});
