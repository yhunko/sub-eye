CREATE TABLE IF NOT EXISTS "comparator_ai_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"period_key" text NOT NULL,
	"analyses_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "comparator_ai_usage_user_period_idx" ON "comparator_ai_usage" USING btree ("user_id","period_key");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "comparator_ai_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"period_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"response" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "comparator_ai_cache_unique_idx" ON "comparator_ai_cache" USING btree ("user_id","period_key","request_hash","model","prompt_version");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comparator_ai_cache_user_period_idx" ON "comparator_ai_cache" USING btree ("user_id","period_key");
