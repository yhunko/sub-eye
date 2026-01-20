DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'period' AND typnamespace = 'public'::regnamespace) THEN
        CREATE TYPE "public"."period" AS ENUM('day', 'week', 'month', 'year');
    END IF;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscriptions" (
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
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'unique_endpoint_idx' AND n.nspname = 'public') THEN
        CREATE UNIQUE INDEX "unique_endpoint_idx" ON "push_subscriptions" USING btree ("user_id","endpoint");
    END IF;
END $$;
