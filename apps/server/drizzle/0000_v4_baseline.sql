-- Custom SQL migration file, put your code below! --

-- ===========================================================================
-- SubEye v4 baseline.
--
-- This file is IDEMPOTENT and works against two starting points:
--   (a) an empty database  -> it creates the five v4 tables
--   (b) the v3 production database -> it adds the new columns, backfills
--       `subscriptions.status` from the old derived rule, then drops every
--       column and table v4 does not use.
-- Re-running it is a no-op. There is no transaction wrapper: Neon's neon-http
-- driver has no interactive transactions, so idempotency is the safety net.
--
-- Production note (verified 2026-07-20): the production branch does NOT have a
-- `subscription_price_phases` table, so the CREATE TABLE IF NOT EXISTS below
-- creates it there rather than only on a fresh database.
-- ===========================================================================

-- --- Enums ------------------------------------------------------------------

DO $$ BEGIN
 CREATE TYPE "period" AS ENUM('day', 'week', 'month', 'year');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint

DO $$ BEGIN
 CREATE TYPE "price_phase_kind" AS ENUM('trial', 'intro', 'scheduledChange', 'standard');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint

DO $$ BEGIN
 CREATE TYPE "subscription_status" AS ENUM('active', 'paused', 'cancelling', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint

-- --- Tables (fresh-database path) -------------------------------------------

CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"preferred_currency" text DEFAULT 'uah' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"date_format" text DEFAULT 'DD/MM/YYYY' NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "fx_rates" (
	"base" text PRIMARY KEY NOT NULL,
	"rates" jsonb NOT NULL,
	"rate_date" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"emoji" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"cost" numeric(10, 2) NOT NULL,
	"currency" text NOT NULL,
	"every" integer DEFAULT 1 NOT NULL,
	"period" "period" DEFAULT 'month' NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"auto_paid" boolean DEFAULT false NOT NULL,
	"category_id" uuid,
	"notes" text,
	"brand_domain" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"payment_date" timestamp with time zone NOT NULL,
	"cancelled_at" timestamp,
	"paused_at" timestamp with time zone,
	"resume_at" timestamp with time zone
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "subscription_price_phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"kind" "price_phase_kind" NOT NULL,
	"cost" numeric(10, 2) NOT NULL,
	"currency" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"applied_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_category_id_categories_id_fk"
   FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "subscription_price_phases" ADD CONSTRAINT "subscription_price_phases_subscription_id_subscriptions_id_fk"
   FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint

-- --- New columns (existing-database path) -----------------------------------

ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "status" "subscription_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "paused_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "resume_at" timestamp with time zone;--> statement-breakpoint

-- --- Data migration: derived lifecycle status -> persisted status -----------
--
-- Before v4, status was computed on every read by
-- getSubscriptionLifecycleStatus() in @subeye/shared:
--     cancelled_at IS NULL                -> 'active'
--     cancelled_at >  now()               -> 'cancelledButActive'  (v4: 'cancelling')
--     cancelled_at <= now()               -> 'cancelled'
-- `cancelled_at` is a NAIVE timestamp written from JS as UTC, so it is compared
-- against `now() at time zone 'utc'`, not `now()`.
-- The ADD COLUMN above already defaulted every row to 'active', which covers
-- the NULL case; these two statements cover the other two.

UPDATE "subscriptions"
   SET "status" = 'cancelling'
 WHERE "cancelled_at" IS NOT NULL
   AND "cancelled_at" >  (now() at time zone 'utc');
--> statement-breakpoint

UPDATE "subscriptions"
   SET "status" = 'cancelled'
 WHERE "cancelled_at" IS NOT NULL
   AND "cancelled_at" <= (now() at time zone 'utc');
--> statement-breakpoint

-- --- Data migration: seed a users row per known user -------------------------
-- Preferences move from Clerk publicMetadata to Postgres. This inserts a
-- defaults-only row so nothing 404s before scripts/backfill-users-from-clerk.ts
-- copies the real values across.

INSERT INTO "users" ("id")
SELECT DISTINCT "user_id" FROM "subscriptions"
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint

INSERT INTO "users" ("id")
SELECT DISTINCT "user_id" FROM "categories"
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint

-- --- Drop legacy columns -----------------------------------------------------
-- scheduled_* were superseded by subscription_price_phases and were kept only
-- for one release of rollback safety. The qstash ids belonged to the QStash
-- workflows v4 deletes. org_id belonged to the organizations feature v4 cuts.

ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "scheduled_cost";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "scheduled_currency";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "scheduled_effective_at";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "qstash_message_id";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "cancellation_qstash_message_id";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "price_change_qstash_message_id";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "org_id";--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN IF EXISTS "org_id";--> statement-breakpoint
ALTER TABLE "subscription_price_phases" DROP COLUMN IF EXISTS "org_id";--> statement-breakpoint
ALTER TABLE "subscription_price_phases" DROP COLUMN IF EXISTS "qstash_message_id";--> statement-breakpoint

-- --- Drop cut tables ---------------------------------------------------------

DROP TABLE IF EXISTS "billing_webhook_events";--> statement-breakpoint
DROP TABLE IF EXISTS "billing_accounts";--> statement-breakpoint
DROP TABLE IF EXISTS "org_billing_accounts";--> statement-breakpoint
DROP TABLE IF EXISTS "push_subscriptions";--> statement-breakpoint
DROP TABLE IF EXISTS "telegram_link_tokens";--> statement-breakpoint
DROP TABLE IF EXISTS "telegram_links";--> statement-breakpoint
DROP TABLE IF EXISTS "comparator_ai_cache";--> statement-breakpoint
DROP TABLE IF EXISTS "comparator_ai_usage";--> statement-breakpoint
DROP TABLE IF EXISTS "comparator_usage";--> statement-breakpoint
DROP TABLE IF EXISTS "subscription_history";--> statement-breakpoint
DROP TYPE IF EXISTS "subscription_action";--> statement-breakpoint

-- --- Indexes -----------------------------------------------------------------

CREATE INDEX IF NOT EXISTS "categories_user_id_idx" ON "categories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_user_id_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_user_status_idx" ON "subscriptions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "price_phases_subscription_idx" ON "subscription_price_phases" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "price_phases_user_idx" ON "subscription_price_phases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "price_phases_subscription_starts_at_idx" ON "subscription_price_phases" USING btree ("subscription_id","starts_at");--> statement-breakpoint

-- Drop indexes that belonged to dropped columns/tables.
DROP INDEX IF EXISTS "subscriptions_org_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "categories_org_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "subscription_history_subscription_user_created_at_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "subscription_history_org_id_idx";
