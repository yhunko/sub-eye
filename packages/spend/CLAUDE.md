# @subeye/spend — the occurrence engine

Pure. No `db`, no `fetch`, no clock reads that are not passed in. Every function that needs
"now" takes it as a parameter. If you find yourself calling `new Date()` at module scope or
inside a loop condition here, stop.

## What an occurrence is

One projected payment event: a concrete `Date` and the amount charged that day. "Spend in a
range" is *always* "sum the amounts of every occurrence whose date falls inside the range" —
never "monthly cost prorated". A weekly subscription contributes four or five occurrences to
a month and all of them count. `collectPaymentsInRange` is the single source of truth; every
other aggregate (`buildMonthlyTrend`, `buildCashFlowForecast`, `sumSpendInRange`) is built on
it or on its sibling `calculateSpendInRange`.

## Invariants

1. **`paymentDate` is the ANCHOR, not the next payment.** It records the first payment. Every
   future occurrence is derived by repeatedly adding the period to it. Never treat it as
   "upcoming" and never mutate it to move a subscription forward.
2. **Anchored month/year arithmetic, always.** `RecurrenceUtils.addPeriod` must be called with
   `{ anchorDate }`. Without it, a subscription anchored on the 31st lands on Feb 28 and then
   *stays* on the 28th forever. With it, March returns to the 31st. Every loop in this package
   already passes the anchor — do not drop it.
3. **Timezone is threaded end to end.** Every public function takes an optional IANA `timezone`
   and passes it to `DateTimezoneUtils`. A month boundary is start-of-month *there*, not on the
   server host. Dropping the parameter silently shifts a whole month of spend for any user not
   on UTC.
4. **Cancellation gating uses `shouldIncludeOccurrence` and `break`s, not `continue`s.** Once
   an occurrence falls at or after the effective cancellation date, the projection stops — all
   later occurrences are unreachable too. This is deliberate; changing it to `continue` would
   project charges past a cancellation.
5. **`resolveOccurrenceAmount` is per-occurrence, not per-subscription.** An occurrence on or
   after a scheduled price change's `effectiveAt` is charged the new price; earlier ones are
   charged the old. This is why a single month can contain two different amounts for the same
   subscription. Any new per-occurrence rule belongs here or in `collectPaymentsInRange`, never
   in the aggregate callers — that is where `pause.ts` lives, and where the next one goes.

## Public-by-design

`collectPaymentsInRange`, `resolveOccurrenceAmount` and `PaymentOccurrence` are exported
specifically so per-occurrence rules can be unit-tested directly instead of through five layers
of aggregation. Keep it that way.

## Structural input types

`BillableSubscription` and `RecurringSubscription` exist because this package must not import
`apps/server`'s Drizzle row types. They list only the fields actually read. A real DB row
satisfies them structurally. If you add a field, add it to the structural type too — do not
reach for the row type.

## The call-site trap this package cannot defend against

Every aggregate is only as consistent as the list handed to it. Passing a filtered "currently
active" list to the run-rate metrics and the unfiltered one to the occurrence metrics makes
`yearlyForecast` and `remainingThisMonth` count different sets of subscriptions — a real bug
once, fixed at the call sites in `apps/server`'s analytics service and pinned by
`apps/server/test/dashboard-metric-agreement.test.ts`. Feed every metric in one response from
the same list.
