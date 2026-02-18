UPDATE "subscriptions"
SET
  "payment_date" = "renewed_at" AT TIME ZONE 'UTC',
  "cancelled_at" = NULL
WHERE "renewed_at" IS NOT NULL;

ALTER TABLE "subscriptions"
DROP COLUMN IF EXISTS "renewed_at";
