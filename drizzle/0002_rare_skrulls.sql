ALTER TABLE "subscriptions" ALTER COLUMN "next_payment_date" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
DROP TYPE "public"."currency";
