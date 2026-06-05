CREATE TYPE "public"."subscription_action" AS ENUM('created', 'updated', 'cancelled', 'renewed', 'deleted', 'uncancelled');--> statement-breakpoint
CREATE TABLE "subscription_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid,
	"user_id" text NOT NULL,
	"action" "subscription_action" NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscription_history" ADD CONSTRAINT "subscription_history_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "subscription_history_subscription_user_created_at_idx" ON "subscription_history" USING btree ("subscription_id","user_id","created_at");
