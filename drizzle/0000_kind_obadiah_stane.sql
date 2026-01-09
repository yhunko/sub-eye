CREATE TYPE "public"."period" AS ENUM('day', 'week', 'month', 'year');--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"cost" numeric(10, 2) NOT NULL,
	"currency" integer NOT NULL,
	"every" integer DEFAULT 1 NOT NULL,
	"period" "period" DEFAULT 'month' NOT NULL,
	"payment_date" timestamp with time zone NOT NULL,
	"auto_paid" boolean DEFAULT false NOT NULL,
	"category" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"qstash_message_id" text,
	"brand_domain" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "unique_endpoint_idx" ON "push_subscriptions" USING btree ("user_id","endpoint");