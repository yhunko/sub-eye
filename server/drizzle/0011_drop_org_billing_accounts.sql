-- Drop org billing accounts table (no longer needed after simplifying to Free + Plus tiers)
-- Family features are now included in Plus plan, managed via admin's personal subscription

DROP TABLE IF EXISTS "org_billing_accounts";

DROP INDEX IF EXISTS "org_billing_paddle_customer_id_idx";
DROP INDEX IF EXISTS "org_billing_paddle_subscription_id_idx";
DROP INDEX IF EXISTS "org_billing_admin_user_id_idx";