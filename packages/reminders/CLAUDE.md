# @subeye/reminders — what to remind about, and when

Planning only. No `expo-notifications`, no OS types, no storage, no catalog.

## Invariants

- `planReminders` is pure and takes `now`. It returns RENDERED `title` and
  `body`, but holds no strings of its own: the copy arrives as an injected
  `ReminderCopy`, because a pure package cannot import paraglide's `m`, which is
  generated into the mobile app and reaches `expo-localization`. The adapter at
  `apps/mobile/src/shared/lib/notifications/copy.ts` is the only place `m` is
  read for a reminder.
- `REMINDER_BUDGET = 56`. iOS keeps only the 64 soonest pending local
  notifications per app and silently drops the rest — no error, no warning.
  The budget counts reminder MORNINGS, not subscriptions, because reminders at
  the same instant are grouped into one digest.
- Sort THEN trim. The budget must keep the soonest reminders, because those are
  the ones iOS would have kept anyway and the ones the user needs first.
- `fireInstant` builds in the DEVICE's zone, deliberately not the account's.
  "09:00, three days before" is wall-clock, and the reminder should land at
  09:00 where the user physically is.
- A trigger in the past fires immediately on iOS. Skip it rather than nag.
- Recurrence comes from `@subeye/time`. There used to be a second, private
  engine in this file that did not know about pause windows or cancellation
  gating. Do not reintroduce one.
- Settings split: the shape, the defaults and the sanitisers live here, the
  MMKV read and write live in the app. `readInt` and `readLeadDays` are exported
  for that reason — they are what stop a blob written by an older build from
  becoming a crash loop.

## Runway

`REMINDER_LOOKAHEAD = 3` one-shot occurrences per subscription means the
schedule covers roughly `min(3, 56/N)` months before it silently runs out, where
N is the active subscription count. Plan C replaces the expressible recurrences
with repeating OS triggers to make that indefinite. Until then, this ceiling is
real — do not describe reminders as permanent.
