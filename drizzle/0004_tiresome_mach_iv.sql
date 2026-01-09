CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "qstash_message_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_endpoint_idx" ON "push_subscriptions" USING btree ("user_id","endpoint");