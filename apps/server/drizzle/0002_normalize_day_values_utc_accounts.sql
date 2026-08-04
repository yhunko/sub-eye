-- `0001` deliberately skipped accounts still on the `UTC` default, because a
-- stored day cannot be reinterpreted without knowing the zone that wrote it.
-- The data says which zone that was.
--
-- Those accounts' rows are stamped at exactly 21:00 or 22:00 UTC — midnight in
-- UTC+3 and UTC+2. No client in this app has ever written a deliberate 22:00,
-- and the same accounts' newest rows sit at exactly 00:00 UTC, which is what the
-- current mobile client writes with `toIsoDay`. So the pre-mobile rows came from
-- a Ukrainian browser whose owner simply never pressed "match device timezone".
--
-- Reinterpreting in Europe/Kyiv is a NO-OP for every already-correct row: 00:00Z
-- is 03:00 in Kyiv on the same calendar day, so it floors straight back to
-- 00:00Z. Only a value that is a Kyiv local midnight — or any other time of day
-- that already agrees — can move. That is what makes this safe to apply blind,
-- and idempotent on re-run.

UPDATE "subscriptions" s
SET "payment_date" =
      (("payment_date" AT TIME ZONE 'Europe/Kyiv')::date)::timestamp AT TIME ZONE 'UTC'
FROM "users" u
WHERE u."id" = s."user_id"
  AND u."timezone" = 'UTC';--> statement-breakpoint

UPDATE "subscriptions" s
SET "cancelled_at" =
      ((("cancelled_at" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Kyiv')::date)::timestamp
FROM "users" u
WHERE u."id" = s."user_id"
  AND u."timezone" = 'UTC'
  AND s."cancelled_at" IS NOT NULL;--> statement-breakpoint

UPDATE "subscriptions" s
SET "resume_at" =
      (("resume_at" AT TIME ZONE 'Europe/Kyiv')::date)::timestamp AT TIME ZONE 'UTC'
FROM "users" u
WHERE u."id" = s."user_id"
  AND u."timezone" = 'UTC'
  AND s."resume_at" IS NOT NULL;
