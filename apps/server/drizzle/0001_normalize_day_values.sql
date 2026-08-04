-- Day-valued columns hold CALENDAR DAYS, and every reader in the app decodes
-- them as the UTC midnight of that day (`toIsoDay` on the client, `formatDate`
-- with `timeZone: "UTC"`, the reminder planner's `getUTC*`).
--
-- The retired web client wrote the picker's LOCAL midnight instead, so every row
-- created before the mobile client took over sits at 21:00/22:00 UTC on the day
-- BEFORE the one the user picked — Apple Music read back as 5 February in the
-- app and 6 February on the invoice. Rows seeded from "today" carry the creation
-- time of day (15:58:01) for the same reason.
--
-- Each value is therefore reinterpreted in the account's own timezone — the zone
-- that produced it — and re-stored as the UTC midnight of that local day. An
-- account still on the "UTC" default is left alone: nothing here can recover a
-- day it never recorded, and truncating would move dates that may be right.
--
-- Idempotent: a value already at UTC midnight maps to itself for a UTC account,
-- and for a zoned one it is already the local day it decodes to.
--
-- `paused_at` is deliberately absent: it records WHEN the user paused, a real
-- instant. So is `subscription_price_phases`, whose `starts_at` is "now" for a
-- phase that begins immediately and a picked day only for a scheduled change —
-- the two are not distinguishable in SQL, and the table is empty in every
-- environment this migration targets.

UPDATE "subscriptions" s
SET "payment_date" =
      (("payment_date" AT TIME ZONE u."timezone")::date)::timestamp AT TIME ZONE 'UTC'
FROM "users" u
WHERE u."id" = s."user_id"
  AND u."timezone" <> 'UTC';--> statement-breakpoint

-- `cancelled_at` is a NAIVE timestamp column, unlike its siblings — it is
-- compared against `now() at time zone 'utc'`, so it decodes as UTC and needs
-- that conversion spelled out before the account's zone is applied.
UPDATE "subscriptions" s
SET "cancelled_at" =
      ((("cancelled_at" AT TIME ZONE 'UTC') AT TIME ZONE u."timezone")::date)::timestamp
FROM "users" u
WHERE u."id" = s."user_id"
  AND u."timezone" <> 'UTC'
  AND s."cancelled_at" IS NOT NULL;--> statement-breakpoint

UPDATE "subscriptions" s
SET "resume_at" =
      (("resume_at" AT TIME ZONE u."timezone")::date)::timestamp AT TIME ZONE 'UTC'
FROM "users" u
WHERE u."id" = s."user_id"
  AND u."timezone" <> 'UTC'
  AND s."resume_at" IS NOT NULL;
