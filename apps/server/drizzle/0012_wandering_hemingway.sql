-- Custom SQL migration file, put your code below! --
CREATE INDEX IF NOT EXISTS "subscriptions_user_id_idx" ON "subscriptions" ("user_id");
