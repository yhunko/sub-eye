# @subeye/pricing — the phase model

Pure. No `db`, no `fetch`, no error classes from `apps/server`. Every function takes "now" as a
parameter or defaults it explicitly.

## What a pricing phase is

A subscription's price over time is an ordered schedule of phases stored in
`subscription_price_phases`. Each has a `kind`:

| kind | meaning |
|---|---|
| `trial` | an initial window, usually cost 0, ending on a fixed date |
| `intro` | a reduced price for a fixed window, then reverts |
| `scheduledChange` | a new standard price taking over on a future date |
| `standard` | the open-ended price paid once specials end |

The subscription row's own `cost`/`currency` always mean **what you pay right now**. Phases
describe the transitions around that value; they never replace it as the source of truth for
the current charge.

## Invariants

1. **`appliedAt` is the idempotency anchor.** `null` means "pending". Once stamped, the phase's
   price has been copied onto the subscription row and every apply path becomes a no-op.
   `selectDuePhases` filters on it. Never derive "already applied" from a date comparison.
   (Until v4 Plan 1 a QStash workflow also fired boundaries, which is where this column came
   from. QStash is gone; the lazy reconciler that runs on every read is now the only firing
   path. Keep the anchor anyway — it is what makes the reconciler safe to run repeatedly.)
2. **Windows are half-open: `[startsAt, endsAt)`.** A phase ending at exactly `now` is over; a
   phase starting at exactly `now` has begun. This is what stops two phases claiming the same
   instant. `getEffectivePhase` and `toPricePhaseDto`'s `isActive` both encode it, and they must
   stay in agreement.
3. **Due phases apply oldest-first.** Each apply overwrites the subscription's cost. Applying
   out of order leaves the row holding a price from the middle of the timeline.
   `selectDuePhases` sorts; do not re-sort or re-filter downstream.
4. **`effectivePhaseKind` is the kind of whichever phase is effective right now** —
   `getEffectivePhase(phases, now)?.kind ?? "standard"`. It and each phase DTO's `isActive`
   derive from the same half-open window rule, so they can never disagree. A pending
   `scheduledChange` sitting in the future is not effective yet, so it stays `standard` until its
   window opens — the user is not on the new price yet. (Before v4 Plan 4 this was a hand-rolled
   scan for an active `trial`/`intro`, which silently reported `standard` for an in-force
   `scheduledChange` and could disagree with `isActive` when windows overlapped.)
5. **A pure function reports a caller error by returning `null`, never by throwing.**
   `resolveScheduledEffectiveAt` returns `null` for `mode: "customDate"` with no `customDate`;
   the server caller converts that into `CustomDateRequiredError`. Do not import server error
   classes here. Note the mode literal is `customDate`, not `custom` —
   `scheduledPriceChangeModes` in `@subeye/shared` is `["nextOccurrence", "customDate"]`.

## What stays in apps/server, deliberately

`SubscriptionPhaseService` keeps everything that awaits a repository or throws a domain error:
`startTrial`, `addIntroDiscount`, `schedulePriceChange`, `cancelPhase`, `applyPhaseNow`,
`applyPhaseByWorkflow`, `applyDuePhases`, `reconcilePhases`, `clearPendingPhases`, and
`assertPhaseWindow` (which throws four different error classes and reads lifecycle status).

`getSubscriptionLifecycleStatus`, `shouldIncludeOccurrence`, `isCurrentlyActiveSubscription`
and `subscriptionLifecycleStatuses` stay in **`@subeye/shared`**. That is cycle avoidance, not
an oversight: `subscriptionLifecycleStatuses` feeds a valibot picklist inside
`@subeye/shared`'s own subscription schema, and `shouldIncludeOccurrence` is consumed by
`@subeye/spend` — moving either would create a package cycle.

## Timezone strings carry an offset, not `Z`

`toStartOfDayInTimezone` builds on `DateTimezoneUtils.toZoned`, which returns a `TZDate`. Its
`toISOString()` therefore yields `2026-07-15T00:00:00.000+03:00`, not the UTC-normalized
`2026-07-14T21:00:00.000Z`. Same instant, different string. These values are written to
`startsAt`/`endsAt`, so **compare phase boundaries as instants (`Date.parse`), never as
strings.** This is pre-existing behaviour, preserved deliberately by the extraction.

## Known defects, unfixed on purpose

Both are described in the v4 design spec §5 and belong to the server-correctness plan:

- **`applyPhaseNow` leaves the timeline lying.** It stamps `appliedAt` and copies the price but
  never closes the preceding phase's `endsAt` nor pulls the applied phase's `startsAt` back to
  now. After "end trial now" the row charges the standard price while `effectivePhaseKind` still
  reports `trial` and `scheduledPriceChange` stays populated. `getUpcomingPhase` is
  `appliedAt`-blind by construction, so no client can compensate.
- **Cancel permanently strands the price.** Cancelling deletes pending phases and renew cannot
  restore them. Cancelling during a trial removes the standard-reversion phase, so after renew
  the subscription is stuck at the trial price forever.
