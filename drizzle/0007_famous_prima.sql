ALTER TABLE "subscriptions" ALTER COLUMN "id" DROP DEFAULT;

ALTER TABLE "subscriptions" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();

ALTER TABLE "subscriptions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
