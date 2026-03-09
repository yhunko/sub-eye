CREATE TABLE IF NOT EXISTS "telegram_links" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "chat_id" text NOT NULL,
  "telegram_user_id" text NOT NULL,
  "telegram_username" text,
  "is_enabled" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "telegram_links_user_id_idx"
  ON "telegram_links" ("user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "telegram_links_chat_id_idx"
  ON "telegram_links" ("chat_id");

CREATE TABLE IF NOT EXISTS "telegram_link_tokens" (
  "id" serial PRIMARY KEY NOT NULL,
  "token" text NOT NULL,
  "user_id" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "consumed_at" timestamp with time zone,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "telegram_link_tokens_token_idx"
  ON "telegram_link_tokens" ("token");

CREATE INDEX IF NOT EXISTS "telegram_link_tokens_user_id_idx"
  ON "telegram_link_tokens" ("user_id");
