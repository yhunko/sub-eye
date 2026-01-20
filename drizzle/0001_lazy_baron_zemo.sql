DO $$ BEGIN
    IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'currency') = 'integer' THEN
        ALTER TABLE "subscriptions" ALTER COLUMN "currency" SET DATA TYPE text;
    END IF;
END $$;
