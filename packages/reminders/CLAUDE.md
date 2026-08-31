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
- Every amount is the PREFERRED currency, never the one the subscription was
  entered in — `billing.preferred.amount`, already converted upstream.
  `ReminderInput` omits `cost`/`currency` so the original is not reachable from
  the planner at all. A trial prices from `upcomingPhase.billing`, not the
  subscription's own, which during a trial is the trial price (usually zero). A
  digest totals only when every event has an amount: one unknown price would
  silently understate the sum.
- Both event streams cover `cancelling`, not just `active`, and stop at the
  first date `shouldIncludeOccurrence` excludes — `edit` can push
  `willBeCancelledAt` past several payments (or past a trial's conversion), and
  those charges still land. A trial-end warning is a CHARGE warning: it goes
  away only when the cancellation beats the conversion, not when one exists. The
  planner and `subscriptionsDueOn` must agree here, because a digest deep-links
  into that screen. This is a DATE question; do not answer it from the status.
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

## Runway — the two modes

`planReminders` returns a `ReminderSchedule`, not a firing instant. It is either
a one-shot `fireAt` or a `RepeatRule` the OS re-fires forever, and the app maps
the second onto expo's `DAILY` / `WEEKLY` / `MONTHLY` / `YEARLY` triggers.

- **Repeating.** One pending slot, one banner, no expiry. A `(subscription,
  lead)` pair that earns a rule contributes NO one-shot occurrences — scheduling
  both double-notifies on the same morning, which is what the `break` in the
  event loop prevents. Repeating groups take the budget FIRST: permanent
  coverage must not be crowded out by a burst of near-term one-shots, and they
  are bounded by subscription count × lead count.
- **One-shot.** Unchanged: `REMINDER_LOOKAHEAD = 3` projected occurrences per
  subscription, past triggers skipped, grouped by firing instant. On its own
  this covers roughly `min(3, 56/N)` months and then runs out silently, which is
  why it is now the FALLBACK rather than the whole design.

Grouping is what keeps both inside the ceiling: one-shots group by firing
instant, repeating ones by **serialised rule**, so two monthly subscriptions
that both fire on day 14 share a single permanent trigger with a digest body.
Without that each eligible subscription takes its own slot and its own banner
every month — a notification-spam regression, not a saving.

## Eligibility is a correctness rule, not a coverage knob

`repeatRuleFor` returns `null` for anything below, and `null` means "use a
one-shot", not "this could be better".

| Condition | Why |
|---|---|
| `status === "active"` | An OS trigger keeps firing whatever the subscription becomes. A future cancellation already derives as `cancelling`, so this covers pending ones too. |
| `upcomingPhase == null` | The amount is baked into the body at schedule time. A price change on a known date makes it wrong. |
| no active `trial` phase | Same failure: the trial ends and the price changes. |
| `every === 1` | `MONTHLY` means every month. `every: 3` has no calendar unit. |
| monthly fire day in `1..28` | Above 28 the trigger silently does not fire in February. Below 1 the lead crosses into the previous month, where the day-of-month differs every time. |
| yearly fire day is not 29 February | Exists one year in four; the other three go quiet. |

**Do not loosen these to cover more subscriptions.** The danger is not a missing
reminder — it is a reminder that keeps arriving for a subscription the user
cancelled, or naming a price that changed, months after the fact, with the app
never opened to notice. That erodes trust in every other reminder. The excluded
cases are not degraded: they keep exactly the one-shot behaviour they had.

Cancelling, pausing, resuming and editing all happen IN the app, which rebuilds
the whole schedule on the spot. Only date-driven transitions can happen while it
is closed, and the predicate is exactly the set of subscriptions that have none
pending.

## The three numbering conventions

Each repeating unit uses a different range, and getting one wrong produces a
reminder on the wrong day rather than an error. Assert the concrete numbers, not
the `unit` — `test/repeatRule.test.ts` does, and
`expo-notifications`'s own `getNextTriggerDateAsync` is the on-device oracle.

| Field | Range | Verified against |
|---|---|---|
| `weekly.weekday` | **1–7, Sunday = 1** — not `Date.getDay()`'s 0–6 | `WeeklyTriggerRecord` passes it straight to `DateComponents.weekday`; Android to `Calendar.DAY_OF_WEEK` |
| `monthly.day` | 1-based, like `Date.getDate()` | passed through untouched on both platforms |
| `yearly.month` | **0-based. January is 0.** | `YearlyTriggerRecord` writes `month: self.month + 1` |

Reading them back out of the OS is a different set of conventions again, and
lives in `apps/mobile/src/shared/lib/notifications/trigger-time.ts`.
