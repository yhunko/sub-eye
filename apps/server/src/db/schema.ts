import { SubscriptionPeriod } from "@subeye/shared";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

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

export const pricePhaseKindEnum = pgEnum("price_phase_kind", [
  "trial",
  "intro",
  "scheduledChange",
  "standard",
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

export const telegramLinksTable = pgTable(
  "telegram_links",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    chatId: text("chat_id").notNull(),
    telegramUserId: text("telegram_user_id").notNull(),
    telegramUsername: text("telegram_username"),
    isEnabled: boolean("is_enabled").notNull().default(true),
    messageTemplate: jsonb("message_template"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("telegram_links_user_id_idx").on(table.userId),
    uniqueIndex("telegram_links_chat_id_idx").on(table.chatId),
  ],
);

export const telegramLinkTokensTable = pgTable(
  "telegram_link_tokens",
  {
    id: serial("id").primaryKey(),
    token: text("token").notNull(),
    userId: text("user_id").notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    consumedAt: timestamp("consumed_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("telegram_link_tokens_token_idx").on(table.token),
    index("telegram_link_tokens_user_id_idx").on(table.userId),
  ],
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

export const categoriesTable = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    emoji: text("emoji").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    orgId: text("org_id"),
  },
  (table) => [
    index("categories_user_id_idx").on(table.userId),
    index("categories_org_id_idx").on(table.orgId),
  ],
);

export const subscriptionsTable = pgTable(
  "subscriptions",
  {
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
    categoryId: uuid("category_id").references(() => categoriesTable.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    qstashMessageId: text("qstash_message_id"),
    cancellationQstashMessageId: text("cancellation_qstash_message_id"),
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
    orgId: text("org_id"),
  },
  (t) => [
    index("subscriptions_user_id_idx").on(t.userId),
    index("subscriptions_org_id_idx").on(t.orgId),
  ],
);

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
    orgId: text("org_id"),
  },
  (table) => [
    index("subscription_history_subscription_user_created_at_idx").on(
      table.subscriptionId,
      table.userId,
      table.createdAt,
    ),
    index("subscription_history_org_id_idx").on(table.orgId),
  ],
);

export const subscriptionPricePhasesTable = pgTable(
  "subscription_price_phases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptionsTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    orgId: text("org_id"),
    kind: pricePhaseKindEnum("kind").notNull(),
    cost: numeric("cost", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull(),
    startsAt: timestamp("starts_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true, mode: "string" }),
    // Set when the boundary fired and the price was copied onto the
    // subscription row. `null` = pending; this is the idempotency anchor.
    appliedAt: timestamp("applied_at", { withTimezone: true, mode: "string" }),
    // The boundary-transition QStash workflow run that owns this phase.
    qstashMessageId: text("qstash_message_id"),
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

export const comparatorUsageTable = pgTable(
  "comparator_usage",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    periodKey: text("period_key").notNull(),
    comparisonsCount: integer("comparisons_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("comparator_usage_user_period_idx").on(
      table.userId,
      table.periodKey,
    ),
  ],
);

export const comparatorAiUsageTable = pgTable(
  "comparator_ai_usage",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    periodKey: text("period_key").notNull(),
    analysesCount: integer("analyses_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("comparator_ai_usage_user_period_idx").on(
      table.userId,
      table.periodKey,
    ),
  ],
);

export const comparatorAiCacheTable = pgTable(
  "comparator_ai_cache",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    periodKey: text("period_key").notNull(),
    requestHash: text("request_hash").notNull(),
    model: text("model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    response: jsonb("response").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("comparator_ai_cache_unique_idx").on(
      table.userId,
      table.periodKey,
      table.requestHash,
      table.model,
      table.promptVersion,
    ),
    index("comparator_ai_cache_user_period_idx").on(
      table.userId,
      table.periodKey,
    ),
  ],
);
