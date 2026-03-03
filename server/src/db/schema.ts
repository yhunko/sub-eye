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

export const billingAccountsTable = pgTable(
  "billing_accounts",
  {
    userId: text("user_id").primaryKey(),
    paddleCustomerId: text("paddle_customer_id"),
    paddleSubscriptionId: text("paddle_subscription_id"),
    paddleSubscriptionStatus: text("paddle_subscription_status"),
    paddlePriceId: text("paddle_price_id"),
    paddleCurrentPeriodEnd: timestamp("paddle_current_period_end", {
      withTimezone: true,
      mode: "string",
    }),
    lastEventOccurredAt: timestamp("last_event_occurred_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("billing_accounts_paddle_customer_id_idx").on(
      table.paddleCustomerId,
    ),
    uniqueIndex("billing_accounts_paddle_subscription_id_idx").on(
      table.paddleSubscriptionId,
    ),
  ],
);

export const billingWebhookEventsTable = pgTable("billing_webhook_events", {
  eventId: text("event_id").primaryKey(),
  eventType: text("event_type").notNull(),
  occurredAt: timestamp("occurred_at", {
    withTimezone: true,
    mode: "string",
  }).notNull(),
  payload: jsonb("payload").notNull(),
  processedAt: timestamp("processed_at").notNull().defaultNow(),
});

export const subscriptionsTable = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  cost: numeric("cost", { precision: 10, scale: 2 }).notNull(),
  scheduledCost: numeric("scheduled_cost", { precision: 10, scale: 2 }),
  currency: text("currency").notNull(),
  scheduledCurrency: text("scheduled_currency"),
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
  priceChangeQstashMessageId: text("price_change_qstash_message_id"),
  brandDomain: text("brand_domain"),
  paymentDate: timestamp("payment_date", {
    withTimezone: true,
    mode: "string",
  }).notNull(),
  scheduledEffectiveAt: timestamp("scheduled_effective_at", {
    withTimezone: true,
    mode: "string",
  }),
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
