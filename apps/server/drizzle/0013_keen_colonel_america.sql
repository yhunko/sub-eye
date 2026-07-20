-- Custom SQL migration file, put your code below! --

-- Unified pricing-timeline model: a subscription's price over time is a
-- schedule of ordered phases (trial / intro / scheduledChange / standard).
-- The subscription row's cost/currency stay authoritative for "what you pay
-- now"; phases describe the transitions/overrides around it.

DO $$ BEGIN
 CREATE TYPE "price_phase_kind" AS ENUM('trial', 'intro', 'scheduledChange', 'standard');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscription_price_phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"org_id" text,
	"kind" "price_phase_kind" NOT NULL,
	"cost" numeric(10, 2) NOT NULL,
	"currency" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"applied_at" timestamp with time zone,
	"qstash_message_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscription_price_phases" ADD CONSTRAINT "subscription_price_phases_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "price_phases_subscription_idx" ON "subscription_price_phases" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "price_phases_user_idx" ON "subscription_price_phases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "price_phases_subscription_starts_at_idx" ON "subscription_price_phases" USING btree ("subscription_id","starts_at");--> statement-breakpoint

-- Backfill: migrate each subscription's single scheduled price change into two
-- phases — the current standard window (now -> effective_at) and the upcoming
-- scheduledChange (effective_at -> open). The scheduledChange carries the
-- existing workflow id so any in-flight transition stays authoritative until
-- reconcilePhases re-homes it. Subscriptions without a scheduled change get no
-- phase rows (their row cost is already authoritative).
INSERT INTO "subscription_price_phases"
	("subscription_id", "user_id", "org_id", "kind", "cost", "currency", "starts_at", "ends_at", "applied_at", "qstash_message_id")
SELECT "id", "user_id", "org_id", 'standard', "cost", "currency", "created_at", "scheduled_effective_at", NULL, NULL
FROM "subscriptions"
WHERE "scheduled_effective_at" IS NOT NULL
	AND "scheduled_cost" IS NOT NULL;
--> statement-breakpoint
INSERT INTO "subscription_price_phases"
	("subscription_id", "user_id", "org_id", "kind", "cost", "currency", "starts_at", "ends_at", "applied_at", "qstash_message_id")
SELECT "id", "user_id", "org_id", 'scheduledChange', "scheduled_cost", COALESCE("scheduled_currency", "currency"), "scheduled_effective_at", NULL, NULL, "price_change_qstash_message_id"
FROM "subscriptions"
WHERE "scheduled_effective_at" IS NOT NULL
	AND "scheduled_cost" IS NOT NULL;

-- NOTE: the legacy scheduled_* columns are intentionally NOT dropped here.
-- They remain readable for one release (rollback safety) and are removed in a
-- follow-up migration once all code paths read phases instead.
