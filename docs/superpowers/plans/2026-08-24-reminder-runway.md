# Reminder Runway Implementation Plan (Plan C)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the reminder schedule from silently expiring when the app is not opened, by scheduling repeating OS triggers for the subscriptions whose recurrence the OS can express.

**Architecture:** `planReminders` stops returning "a firing instant" and starts returning "a schedule" — either a one-shot date, as today, or a repeat rule the OS re-fires forever. A subscription qualifies for a repeat rule only when its reminder stream has no scheduled end and no scheduled price change, and when its recurrence maps cleanly onto a calendar unit. Everything else keeps the current one-shot behaviour unchanged.

**Tech Stack:** `expo-notifications` (`DAILY` / `WEEKLY` / `MONTHLY` / `YEARLY` repeating triggers), `@subeye/reminders`, `bun:test`.

## Prerequisite

Plans A and B complete and merged. `@subeye/reminders` exists as a pure package with the injected-copy design, and `apps/mobile/src/shared/lib/notifications/` is the platform adapter over it.

## Global Constraints

- **Runner is `bun:test`.** There is no vitest in this repo.
- **No new external npm dependencies.** `expo-notifications` already supports every trigger type this plan uses.
- **`@subeye/reminders` stays pure.** No `expo` import, no OS types, no storage, no clock, no i18n. `now` is a parameter and the copy is injected.
- **Comment discipline** (root CLAUDE.md): comments only for a quirk, a trap, a non-obvious edge case, or a rationale invisible at the call site.
- **Commits are conventional.** One per task.
- **Gates:** `bun run type-check`, `bun run test`, `bun run check:boundaries`, `bun run check:circular`, plus `TZ=America/Los_Angeles` and `TZ=Pacific/Auckland` runs.
- **Never run `expo` from the repo root.**

---

## The problem, stated precisely

Every reminder is a one-shot `DATE` trigger. `REMINDER_LOOKAHEAD = 3` projects three occurrences per subscription, `REMINDER_BUDGET = 56` caps the pending set, and the whole schedule is rebuilt only when the app foregrounds.

So the runway is **`min(3 months, 56/N months)`** for N active monthly subscriptions. Fifteen subscriptions gives about three months; thirty gives under two. After that, reminders stop. No error, no banner, nothing — which is precisely the failure mode for a user who sets up their subscriptions and then does not open the app, which is the whole point of the product.

Raising `REMINDER_LOOKAHEAD` does not fix it. The iOS ceiling becomes the binding constraint instead, and `56/N` months is not much better than three.

A repeating trigger occupies **one** pending slot and fires forever. For a plain monthly subscription that converts three expiring slots into one permanent one — strictly better on both runway and budget.

## What repeating triggers cost, honestly

Three costs. The first two are managed by the eligibility predicate; the third is real and accepted.

**1. State that changes while the app is closed.** A repeating trigger keeps firing regardless of what the subscription becomes. A `cancelling` subscription whose end date passes, or a `paused` one whose `resumeAt` arrives, would go on reminding — and a reminder for a subscription you cancelled is worse than no reminder, because it erodes trust in every other one.

Note this only bites for **date-driven** transitions. Cancelling, pausing and editing all happen *in the app*, which rebuilds the schedule on the spot. The predicate excludes exactly the subscriptions with a pending date-driven change.

**2. A stale amount.** The body is baked when the trigger is scheduled. A price phase applying later would make it wrong — so a subscription with a pending phase or an active trial does not get a repeat rule.

**3. Ragged months.** "Three days before the 2nd" is a different day-of-month every month, and a `MONTHLY` trigger on day 30 simply does not fire in February. Both are excluded by an arithmetic guard rather than approximated.

## Eligibility — `canRepeat`

A subscription earns a repeat rule for lead time `L` when **all** of these hold. Every field is already on `ReminderInput`; no type changes are needed.

| Condition | Why |
|---|---|
| `status === "active"` | Excludes `paused`, `cancelling` and `cancelled`. An active subscription with a future cancellation already derives as `cancelling`, so this covers pending cancellations too. |
| `upcomingPhase == null` | A pending price change makes the baked amount wrong on a known date. |
| no active `trial` phase in `pricePhases` | Same: the trial ends and the price changes. |
| `every === 1` | `every: 3` (quarterly) has no calendar unit. `MONTHLY` means every month. |
| period-specific day arithmetic | See below. |

Day arithmetic, given `d` = the UTC day-of-month of `nextPaymentDate` and lead `L`:

| Period | Rule | Guard |
|---|---|---|
| `day` | `DAILY { hour, minute }` | none — always expressible |
| `week` | `WEEKLY { weekday, hour, minute }` | none — weeks are uniform |
| `month` | `MONTHLY { day: d - L, hour, minute }` | **`1 ≤ d - L ≤ 28`**. Below 1 crosses a month boundary and the day varies; above 28 silently skips February. |
| `year` | `YEARLY { month, day, hour, minute }` of `nextPaymentDate - L days` | not 29 February |

For `lead 1`, the monthly guard admits payment days 2 through 29 — the large majority. Days 30, 31 and 1 fall back to one-shot `DATE` reminders and behave exactly as they do today.

## Grouping still works, and gets cheaper

Today reminders are grouped by **firing instant** so two renewals on the same morning become one digest banner. Repeating reminders group by **repeat rule** instead: two monthly subscriptions that both fire on day 14 at 09:00 share one repeating trigger carrying a digest body.

That is one slot, one banner, forever — better than today on both counts. Without it, each eligible subscription would take its own slot and its own banner every month, which is the notification-spam regression this avoids.

---

## Task C1: the schedule model and the planner

**Files:**
- Modify: `packages/reminders/src/reminder.ts`
- Modify: `packages/reminders/src/planReminders.ts`
- Modify: `packages/reminders/test/planReminders.test.ts`
- Create: `packages/reminders/test/repeatRule.test.ts`
- Modify: `packages/reminders/CLAUDE.md`

**Interfaces:**
- Consumes: unchanged — `@subeye/model`, `@subeye/time`, `@subeye/money`, `@subeye/lifecycle`, `@subeye/pricing`.
- Produces:
  ```ts
  export type RepeatRule =
    | { unit: "daily"; hour: number; minute: number }
    /** 1–7, Sunday = 1 — expo's convention, NOT `Date.getDay()`'s 0–6. */
    | { unit: "weekly"; weekday: number; hour: number; minute: number }
    /** `day` is 1-based, like `Date.getDate()`. */
    | { unit: "monthly"; day: number; hour: number; minute: number }
    /** `month` is 0-BASED, like `Date.getMonth()`. January is 0. */
    | { unit: "yearly"; month: number; day: number; hour: number; minute: number };

  export type ReminderSchedule =
    | { repeats: false; fireAt: Date }
    /** `firstAt` is for ordering and for the health screen only — the OS owns
      * every firing after it. */
    | { repeats: true; rule: RepeatRule; firstAt: Date };

  export type Reminder = {
    kind: ReminderKind;
    schedule: ReminderSchedule;
    title: string;
    body: string;
    target: ReminderTarget;
  };

  export const repeatRuleFor: (
    subscription: ReminderInput,
    leadDays: number,
    hour: number,
    minute: number,
  ) => RepeatRule | null;
  ```
  `Reminder.fireAt` is **replaced** by `schedule`. Every consumer must handle both cases; that is deliberate, and it is what stops the adapter silently treating a repeat rule as a one-shot date.

- [ ] **Step 1: Write the failing eligibility tests**

Create `packages/reminders/test/repeatRule.test.ts`. `repeatRuleFor` returns `null` for anything ineligible — a pure function reports a caller error by returning `null`, and here `null` simply means "use a one-shot".

```ts
import { describe, expect, test } from "bun:test";
import { SubscriptionPeriod } from "@subeye/model";
import { repeatRuleFor } from "../src";

const monthlyOnThe14th = {
  id: "s1",
  name: "Netflix",
  every: 1,
  period: SubscriptionPeriod.MONTH,
  nextPaymentDate: "2026-09-14T00:00:00.000Z",
  status: "active" as const,
  billing: {
    original: { currencyCode: "usd", monthly: 15 },
    preferred: { currencyCode: "uah", amount: 620, monthly: 620, yearly: 7440, exchangeRate: 41.3 },
  },
};

describe("repeatRuleFor", () => {
  test("a plain monthly subscription repeats on the lead day", () => {
    expect(repeatRuleFor(monthlyOnThe14th, 1, 9, 0)).toEqual({
      unit: "monthly", day: 13, hour: 9, minute: 0,
    });
  });

  // Day 30 does not exist in February, and a MONTHLY trigger on a day the month
  // lacks does not fire — silently. One missed renewal a year is worse than a
  // one-shot reminder that at least fires.
  test("a fire day above 28 is refused", () => {
    const onThe31st = { ...monthlyOnThe14th, nextPaymentDate: "2026-10-31T00:00:00.000Z" };
    expect(repeatRuleFor(onThe31st, 1, 9, 0)).toBeNull();
  });

  // "Three days before the 2nd" is 30 Jan, 27 Feb, 30 Mar — a different
  // day-of-month every month, which no monthly rule can express.
  test("a lead that crosses the month boundary is refused", () => {
    const onThe2nd = { ...monthlyOnThe14th, nextPaymentDate: "2026-09-02T00:00:00.000Z" };
    expect(repeatRuleFor(onThe2nd, 3, 9, 0)).toBeNull();
  });

  test("every > 1 has no calendar unit", () => {
    expect(repeatRuleFor({ ...monthlyOnThe14th, every: 3 }, 1, 9, 0)).toBeNull();
  });

  // These three are the correctness guard, not an optimisation: a repeating
  // trigger keeps firing whatever the subscription becomes, and the app is not
  // open to notice a date-driven transition.
  test.each([
    ["paused", { status: "paused" as const }],
    ["cancelling", { status: "cancelling" as const }],
    ["cancelled", { status: "cancelled" as const }],
  ])("a %s subscription is refused", (_label, patch) => {
    expect(repeatRuleFor({ ...monthlyOnThe14th, ...patch }, 1, 9, 0)).toBeNull();
  });

  test("a pending price change is refused — the baked amount would go stale", () => {
    const withPending = {
      ...monthlyOnThe14th,
      upcomingPhase: { billing: monthlyOnThe14th.billing },
    };
    expect(repeatRuleFor(withPending, 1, 9, 0)).toBeNull();
  });

  test("an active trial is refused for the same reason", () => {
    const onTrial = {
      ...monthlyOnThe14th,
      pricePhases: [{ kind: "trial" as const, endsAt: "2026-09-30T00:00:00.000Z", isActive: true }],
    };
    expect(repeatRuleFor(onTrial, 1, 9, 0)).toBeNull();
  });

  test("weekly and daily are always expressible", () => {
    expect(repeatRuleFor({ ...monthlyOnThe14th, period: SubscriptionPeriod.WEEK }, 1, 9, 0))
      .toMatchObject({ unit: "weekly", hour: 9, minute: 0 });
    expect(repeatRuleFor({ ...monthlyOnThe14th, period: SubscriptionPeriod.DAY }, 0, 9, 0))
      .toEqual({ unit: "daily", hour: 9, minute: 0 });
  });

  test("29 February is refused for a yearly subscription", () => {
    const leapDay = {
      ...monthlyOnThe14th,
      period: SubscriptionPeriod.YEAR,
      nextPaymentDate: "2028-02-29T00:00:00.000Z",
    };
    expect(repeatRuleFor(leapDay, 0, 9, 0)).toBeNull();
  });
});
```

⚠️ **Three numbering conventions, verified against `node_modules/expo-notifications/build/Notifications.types.d.ts` on 2026-08-24. All three are off-by-one traps that no `toMatchObject({ unit })` assertion catches.**

| Field | Convention | Source |
|---|---|---|
| `weekly.weekday` | **1–7, Sunday = 1.** Not `Date.getDay()`'s 0–6. | `WeeklyTriggerInput` doc comment states it explicitly |
| `monthly.day` | 1-based, like `Date.getDate()` | — |
| `yearly.month` | **0-based. January is 0.** | `YearlyTriggerInput`: "All properties are specified in JavaScript `Date` object's ranges (i.e. January is represented as 0)" |

Assert the concrete numbers in the tests, not just the `unit`.

**Do not settle this by reading alone — `expo-notifications` ships the oracle.** `getNextTriggerDateAsync(trigger)` returns when a trigger input would next fire, without scheduling it or waiting. Use it on-device in Task C3 to confirm each rule resolves to the date you expect. It is the difference between believing the conventions and knowing them.

- [ ] **Step 2: Run to verify it fails**

Run: `bun test packages/reminders/test/repeatRule.test.ts`

Expected: FAIL — `Export named 'repeatRuleFor' not found in module`.

- [ ] **Step 3: Implement `repeatRuleFor`**

In `packages/reminders/src/planReminders.ts`. Read the fire day from the UTC components of `nextPaymentDate` — `nextPaymentDate` is a UTC-midnight calendar day and the rest of the file already reads it that way.

The hour and minute come from settings and are **wall-clock in the device's zone**, which is what `fireInstant` already does deliberately. A repeat rule inherits that: the OS interprets `{ day, hour, minute }` in the device's own zone, which is exactly right and is the same choice made for one-shots.

- [ ] **Step 4: Run to verify it passes**

Run: `bun test packages/reminders/test/repeatRule.test.ts`, then under `TZ=America/Los_Angeles` and `TZ=Pacific/Auckland`. Identical results.

- [ ] **Step 5: Convert `Reminder.fireAt` to `Reminder.schedule`**

In `reminder.ts`, replace `fireAt: Date` with `schedule: ReminderSchedule`.

In `planReminders`, split the event stream:

1. For each subscription and each lead time, ask `repeatRuleFor`. If it returns a rule, that `(subscription, lead)` pair produces a **repeating** event and contributes **no** one-shot occurrences — otherwise it would double-notify.
2. Everything else produces one-shot events exactly as today, unchanged: the `REMINDER_LOOKAHEAD` projection, the past-trigger skip, the same-subscription dedupe.
3. Group repeating events by their **serialised rule** (same rule → one notification) and one-shot events by **firing instant**, as today. Both group kinds flow through the existing `describe`, which needs no change beyond taking a `ReminderSchedule` instead of a `fireAt`.
4. **Budget: repeating first, then one-shot soonest-first.** A repeating trigger is permanent coverage and must not be crowded out by a burst of near-term one-shots. Repeating groups are bounded by subscription count × lead count, so they cannot run away.

`trialEnd` events are one-shot by nature — a trial ends once. They never produce a rule.

- [ ] **Step 6: Update the existing planner tests**

`packages/reminders/test/planReminders.test.ts` asserts `reminders[0]?.fireAt` in several places. Those become `schedule.fireAt` behind a `repeats === false` narrowing.

**Every existing expected string must still pass unedited.** They are the regression net for `describe`'s six branches, and this task does not change any copy.

Add one case that pins the double-notify guard: a repeat-eligible subscription must produce exactly one reminder for that lead, not a repeating one *and* three one-shots.

- [ ] **Step 7: Gates**

```bash
bun install
bun run type-check && bun run test && bun run check:boundaries && bun run check:circular
TZ=America/Los_Angeles bun run test
TZ=Pacific/Auckland bun run test
```

Expected: `apps/mobile` fails to type-check, because the adapter still reads `reminder.fireAt`. That is the intended failure and Task C2 fixes it — do **not** patch the adapter here, and do not commit until C2 is green.

- [ ] **Step 8: Update `packages/reminders/CLAUDE.md`**

Replace the "Runway" section. It currently states the `min(3, 56/N)` months ceiling as a live limitation. Describe the two-mode model instead, the eligibility predicate and, most importantly, **why** ineligibility is a correctness rule rather than a missing feature.

---

## Task C2: schedule the repeat rules

**Files:**
- Modify: `apps/mobile/src/shared/lib/notifications/index.ts`
- Modify: `apps/mobile/src/shared/lib/notifications/trigger-time.ts` + its test
- Modify: `apps/mobile/src/widgets/notifications-page/ui/notifications-page.tsx`

- [ ] **Step 1: Map `RepeatRule` onto an expo trigger**

In `rebuild`, switch on `reminder.schedule.repeats`:

- `false` → the existing `DATE` trigger, unchanged.
- `true` → `SchedulableTriggerInputTypes.DAILY | WEEKLY | MONTHLY | YEARLY` with the rule's components and the same `channelId`.

Everything else in `rebuild` stays: the `cancelAllScheduledNotificationsAsync` wholesale rebuild, the generation guard checked on **every** iteration, the permission re-check, `REMINDER_BUDGET + 1` to detect truncation.

Read the trigger input types from `node_modules/expo-notifications/build/Notifications.types.d.ts` rather than assuming field names.

- [ ] **Step 2: Teach `trigger-time.ts` about repeating triggers**

`readNotificationHealth` reports the scheduled count and the next fire time from the OS's own pending list, which is the only evidence the whole path works. `triggerTime` currently understands `DATE` and `TIME_INTERVAL`; a repeating request would return `null` and silently vanish from "next fire time" — making a correctly-scheduled repeating reminder look like a broken one.

**The exact defect, confirmed by reading the file on 2026-08-24.** `triggerTime` handles the iOS calendar read-back — `{ type: "calendar", dateComponents: { year, month, day, hour, minute } }` — but only when **`year`, `month` and `day` are all numbers**. A repeating trigger has no `year` (that is what makes it repeat), and a `MONTHLY` one has no `month` either. So the guard fails, the function falls through to the `seconds` / `value` / `date` branches, finds none, and returns `null`.

The consequence is exactly the silent failure the file's own header warns about, one level deeper: the count stays right while the next-fire-time disappears, so a correctly-scheduled repeating reminder reads as broken on the status screen.

Fix: when `year` is absent, treat the components as a **recurrence pattern** and compute the next instant matching whichever components are present. Add a test per unit, including the case where today's fire time has already passed so the answer is next month rather than today.

⚠️ Keep the existing header comment. It documents why `.value` and `.date` are useless on iOS, which is still true and still the reason this file exists.

- [ ] **Step 3: Make the status line tell the truth**

The notifications screen shows a scheduled count and an `atBudget` warning. With repeating triggers, "12 scheduled" no longer means "12 reminders then silence" — it means most of them recur.

Rewrite the copy so it is accurate, in **both** `messages/en.json` and `messages/uk.json`, then `bun run --cwd apps/mobile i18n:generate`. Do not leave a status line that undercounts the coverage; the whole point of this plan is that the schedule no longer expires.

- [ ] **Step 4: Gates**

```bash
bun install
bun run type-check && bun run test && bun run check:boundaries && bun run check:circular
TZ=America/Los_Angeles bun run test
TZ=Pacific/Auckland bun run test
```

All green now, including `apps/mobile`.

- [ ] **Step 5: Commit both tasks together**

C1 leaves the repo un-type-checkable on its own, so the two land as one commit.

```bash
git add packages/reminders apps/mobile
git commit -m "feat(reminders): schedule repeating triggers so the plan stops expiring"
```

---

## Task C3: verify on a device

The gates cannot prove the OS re-fires anything. This is the only task that can.

- [ ] **Step 1: Confirm what actually got scheduled**

```bash
bun run --cwd apps/mobile ios
```

With several subscriptions on different renewal days, at least one on day 30 or 31, one paused, one cancelling and one with a pending price change:

- Settings → Notifications shows a non-zero count and a sensible next fire time.
- Log `getAllScheduledNotificationsAsync()` and confirm the eligible ones carry `MONTHLY`/`WEEKLY`/`YEARLY` triggers and the ineligible ones carry `DATE`.
- The day-30 subscription, the paused one, the cancelling one and the one with a pending phase must **all** be `DATE`. That is the predicate working.

- [ ] **Step 2: Prove a repeating trigger actually re-fires**

The only honest test is a clock change. Set a subscription's fire time a couple of minutes ahead, wait for it, then advance the device clock past the next month boundary and confirm it fires again without the app being opened.

Settings → General → Date & Time → turn off Set Automatically. **Turn it back on afterwards** — a device left on a wrong clock will produce baffling results in every later test.

- [ ] **Step 3: Prove the double-notify guard**

A repeat-eligible subscription must produce exactly one banner on its lead morning, not one from a repeating trigger and another from a leftover one-shot.

- [ ] **Step 4: Prove the digest still groups**

Two repeat-eligible subscriptions on the same renewal day must share **one** repeating trigger and produce one banner naming both — not two banners.

- [ ] **Step 5: Prove cancellation stops the reminders**

Cancel a repeat-eligible subscription in the app, then re-read the pending list: its repeating trigger must be gone. This is the in-app path, which rebuilds on the spot, and it is the case that makes the whole design safe.

- [ ] **Step 6: Commit any fixes**

If nothing needed fixing there is no commit, and that is the correct outcome.

---

## Explicitly not doing

**Background refresh.** `expo-background-task` (BGTaskScheduler) could rebuild the schedule without the user opening the app. It is deliberately excluded: iOS runs background tasks opportunistically for apps the user has *engaged with recently*, which is exactly the opposite of the user this plan exists for. It would add a dependency and a native rebuild in exchange for help that arrives only when it is least needed. Revisit if repeating triggers turn out not to cover enough subscriptions in practice.

**Raising `REMINDER_LOOKAHEAD`.** It does not help. Once the lookahead exceeds `56/N` the iOS ceiling binds instead, and the one-shot subscriptions are the ones that could not be expressed as a rule — a longer projection just fills the budget faster.

**Re-anchoring repeat rules on drift.** A subscription's day-of-month does not move on its own; only `resume` rolls the anchor forward, and resume happens in the app, which rebuilds. There is nothing to reconcile.

## Self-review notes

**What this changes for the user.** A plain active monthly subscription reminds forever instead of for three months. A subscription that is paused, cancelling, on a trial, on a pending price change, billed every N periods, or renewing on the 1st, 30th or 31st keeps exactly today's behaviour — no regression, no new failure mode.

**The riskiest thing here** is not the repeat rules; it is `trigger-time.ts`. If it fails to read a repeating trigger back, the notifications screen reports a lower count and a missing next-fire-time, and a correctly working schedule looks broken. Step 2 of C2 is where the care goes.
