# @subeye/store — ports and use-cases

The only package that touches IO, and only through injected ports. It must never
import a database driver, `fetch`, or a platform API. The server supplies
Drizzle adapters today (`apps/server/src/domains/ports.ts`); the mobile app
supplies MMKV adapters in the offline plan.

## Shape

Every use-case is `(ports, ...args)`. Every mutation is the same three steps:
read the record, call a pure function from `lifecycle`/`pricing`, write the
patch. A pure function returning `null` becomes a throw from `errors.ts` here —
that conversion is this package's job and nowhere else's.

Nothing reads a clock or invents an id on its own: `ports.now()` and
`ports.newId()`, never `new Date()` or a uuid call.

## Invariants

- **Single tenant.** There is no `userId` on any record. A multi-tenant host
  supplies the tenant in its port implementation — and it is the ONLY thing
  standing between one account and another's data.
- **`appliedAt` is the idempotency anchor.** `applyPhaseByWorkflow` and
  `applyBoundary` are no-ops once it is set. Never apply a phase without
  checking it, and never clear it.
- **Phases apply lazily, on read.** There is no scheduler. `applyDuePhases` runs
  from `getSubscription` and from nowhere else. A boundary therefore fires the
  next time that subscription is opened, not at the instant it comes due — and
  `listSubscriptions` must never settle one. `test/listDoesNotWrite.test.ts`
  pins both halves.
- **`applyPhaseNow` must close the timeline it moves.** Stamping `appliedAt` and
  copying the price is not enough — it must also close the preceding phase's
  `endsAt` and pull the applied phase's `startsAt` back to now if it was in the
  future. `test/phaseApplyNow.test.ts` is the regression.
- **An intro discount is measured in CHARGES, not in days.** `startPhase` takes
  `payments` + `startMode` and `startPricingSchedule` derives the boundary from
  the recurrence — `count` whole cycles past the first discounted charge, which
  lands the revert on the first charge at the standard price again. Asking a
  caller for an `endsAt` is what made the half-open window off by one payment:
  the date of the LAST discounted charge silently bought one fewer. Creation
  still passes a date (`startDatedOffer`) because a brand-new subscription's
  offer has no history to be off against.
- **A deferred offer must not move the row.** `startMode: "nextPayment"` leaves
  `cost` alone and writes the phase with `appliedAt: null`, so the ordinary
  due-phase machinery flips the price when the charge arrives. Writing it
  immediately made the app report a discount a month before it existed, on a
  period the user had already paid full price for.
- **Cancelling does not delete pending phases.** Keeping them is what lets renew
  restore the real reversion price instead of stranding the user on the trial
  cost.
- **The status column is written on every lifecycle mutation**, derived from the
  date columns. A stale column hides a subscription from every filter.
- **Which list feeds which metric is load-bearing.** See the comment in
  `analytics.ts`. `yearlyForecast` is a range sum, not `burnRate × 12` — a
  cancelling subscription keeps a full run-rate but contributes fewer charges.

## Tests

Drive `test/inMemoryPorts.ts`, never a per-test fake, and assert on state read
back through `dump()`. Reading state back catches a use-case that forgot to
write; a spy only proves a call happened. `test/fixtures.ts` holds the records
and the single injected `NOW` every test shares.
