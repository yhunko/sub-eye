ALTER TABLE "telegram_links"
ADD COLUMN IF NOT EXISTS "message_template" jsonb;
