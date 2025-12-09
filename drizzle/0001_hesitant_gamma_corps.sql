-- Convert currency text ('USD', 'UAH', …) to numeric ISO codes (840, 980)
ALTER TABLE "subscriptions"
ALTER COLUMN "currency" TYPE integer
  USING (
    CASE "currency"
      WHEN 'USD' THEN 840
      WHEN 'UAH' THEN 980
      ELSE NULL
    END
  );

-- Change "every" to integer and set default
ALTER TABLE "subscriptions"
ALTER COLUMN "every" TYPE integer
  USING ("every"::integer);

ALTER TABLE "subscriptions"
    ALTER COLUMN "every" SET DEFAULT 1;
