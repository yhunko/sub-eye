ALTER TABLE "subscriptions"
ADD COLUMN IF NOT EXISTS "scheduled_cost" numeric(10, 2);

ALTER TABLE "subscriptions"
ADD COLUMN IF NOT EXISTS "scheduled_currency" text;

ALTER TABLE "subscriptions"
ADD COLUMN IF NOT EXISTS "scheduled_effective_at" timestamp with time zone;

ALTER TABLE "subscriptions"
ADD COLUMN IF NOT EXISTS "price_change_qstash_message_id" text;
