DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'subscriptions'
    AND column_name = 'branded_domain'
  ) THEN
ALTER TABLE "subscriptions" RENAME COLUMN "branded_domain" TO "brand_domain";

ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'subscriptions'
    AND column_name = 'brand_domain'
  ) THEN
    RAISE NOTICE 'Column brand_domain already exists, skipping rename.';

ELSE
ALTER TABLE "subscriptions" ADD COLUMN "brand_domain" text;
END IF;
END $$;
