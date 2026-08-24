# @subeye/time — calendar days and recurrence

A calendar day is UTC midnight. An instant is an instant. This package holds the
line between them, and every other package depends on it holding.

## Invariants

- `toCalendarDay` re-reads a value in UTC — it does not floor. What it returns is
  a `TZDate` pinned to UTC, so every getter on it (`getDate`, `getMonth`,
  `setDate`) answers in UTC rather than the host zone. That is what makes it the
  ONLY correct way to build an anchor for `RecurrenceUtils`. Flooring to the day
  is `currentCalendarDay`'s job.
- `RecurrenceUtils` uses host-local getters. It is zone-stable ONLY because
  callers hand it a value that has already been through `toCalendarDay`. That
  invariant is enforced by convention, not by the type system — it is the single
  thing most likely to break as new call sites appear. `test/recurrence.test.ts`
  pins it; run the suite under `TZ=America/Los_Angeles` as well as UTC.
- Occurrences are always measured FROM the anchor, never by repeated stepping.
  Stepping lets a clamped month (Jan 31 → Feb 28) drag every later occurrence
  back with it.
- `now` is a parameter. This package never reads a clock except in
  `DateTimezoneUtils.now`, which exists to be that clock for callers that want one.
- **This package is a leaf.** It imports from no other `@subeye/*` package. That
  is why `RecurrencePeriod` is declared here instead of importing
  `SubscriptionPeriod`: `@subeye/model` reaches back into `time` for calendar
  days, so an edge outward would be a cycle. The string enum is assignable to the
  union, so call sites are unaffected.

## Hermes

`Intl.DateTimeFormat(…, { timeZoneName: "longOffset" })` verified working on
device 2026-08-24 — returned `GMT+03:00` for `Europe/Kyiv`. This is what makes
`TZDate` from `@date-fns/tz` safe here. If it ever regresses, the library
swallows the failure and `tzOffset` returns `NaN`, so every derived date becomes
Invalid Date with nothing thrown. Re-probe before trusting a new RN or Hermes
version.
