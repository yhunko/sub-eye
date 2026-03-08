ALTER TABLE "subscriptions"
ADD COLUMN IF NOT EXISTS "renewed_at" timestamp;
