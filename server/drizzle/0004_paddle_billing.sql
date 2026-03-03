CREATE TABLE IF NOT EXISTS "billing_accounts" (
  "user_id" text PRIMARY KEY NOT NULL,
  "paddle_customer_id" text,
  "paddle_subscription_id" text,
  "paddle_subscription_status" text,
  "paddle_price_id" text,
  "paddle_current_period_end" timestamp with time zone,
  "last_event_occurred_at" timestamp with time zone,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "billing_accounts_paddle_customer_id_idx"
  ON "billing_accounts" ("paddle_customer_id");

CREATE UNIQUE INDEX IF NOT EXISTS "billing_accounts_paddle_subscription_id_idx"
  ON "billing_accounts" ("paddle_subscription_id");

CREATE TABLE IF NOT EXISTS "billing_webhook_events" (
  "event_id" text PRIMARY KEY NOT NULL,
  "event_type" text NOT NULL,
  "occurred_at" timestamp with time zone NOT NULL,
  "payload" jsonb NOT NULL,
  "processed_at" timestamp NOT NULL DEFAULT now()
);
