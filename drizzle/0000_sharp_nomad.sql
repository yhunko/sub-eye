CREATE TYPE "public"."currency" AS ENUM('UAH', 'EUR', 'USD');--> statement-breakpoint
CREATE TYPE "public"."period" AS ENUM('day', 'week', 'month', 'year');--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_currency" "currency" NOT NULL,
	"to_currency" "currency" NOT NULL,
	"rate" numeric(18, 6) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"cost" numeric(10, 2) NOT NULL,
	"currency" "currency" NOT NULL,
	"every" numeric(5, 0) DEFAULT '1' NOT NULL,
	"period" "period" DEFAULT 'month' NOT NULL,
	"next_payment_date" timestamp NOT NULL,
	"auto_paid" boolean DEFAULT false NOT NULL,
	"category" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
