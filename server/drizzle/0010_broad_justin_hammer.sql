-- Custom SQL migration file, put your code below! --

-- Add org_id to subscriptions (nullable; NULL = personal space)
ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "org_id" text;

CREATE INDEX IF NOT EXISTS "subscriptions_org_id_idx" ON "subscriptions" ("org_id");

-- Add org_id to categories (nullable; NULL = personal space)
ALTER TABLE "categories"
  ADD COLUMN IF NOT EXISTS "org_id" text;

CREATE INDEX IF NOT EXISTS "categories_org_id_idx" ON "categories" ("org_id");

-- Add org_id to subscription_history (denormalized for org cascade delete)
ALTER TABLE "subscription_history"
  ADD COLUMN IF NOT EXISTS "org_id" text;

CREATE INDEX IF NOT EXISTS "subscription_history_org_id_idx" ON "subscription_history" ("org_id");

-- Create org billing accounts table
CREATE TABLE IF NOT EXISTS "org_billing_accounts" (
  "org_id" text PRIMARY KEY NOT NULL,
  "admin_user_id" text NOT NULL,
  "paddle_customer_id" text,
  "paddle_subscription_id" text,
  "paddle_subscription_status" text,
  "paddle_price_id" text,
  "paddle_current_period_end" timestamp with time zone,
  "last_event_occurred_at" timestamp with time zone,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "org_billing_paddle_customer_id_idx"
  ON "org_billing_accounts" ("paddle_customer_id");

CREATE UNIQUE INDEX IF NOT EXISTS "org_billing_paddle_subscription_id_idx"
  ON "org_billing_accounts" ("paddle_subscription_id");

CREATE INDEX IF NOT EXISTS "org_billing_admin_user_id_idx"
  ON "org_billing_accounts" ("admin_user_id");
