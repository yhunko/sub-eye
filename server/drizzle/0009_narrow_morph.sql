-- Custom SQL migration file, put your code below! --

-- Create categories table
CREATE TABLE IF NOT EXISTS "categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "name" text NOT NULL,
  "emoji" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Create index on user_id
CREATE INDEX IF NOT EXISTS "categories_user_id_idx" ON "categories" ("user_id");

-- Add category_id to subscriptions (nullable FK references categories)
ALTER TABLE "subscriptions"
  ADD COLUMN "category_id" uuid REFERENCES "categories"("id") ON DELETE SET NULL;

-- Drop old free-text category column
ALTER TABLE "subscriptions"
  DROP COLUMN IF EXISTS "category";
