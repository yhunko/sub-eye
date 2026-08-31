# @subeye/lifecycle — statuses, legality, and transitions

## Two status vocabularies exist. Do not compare across them.

- `subscriptionStatuses` — `active | paused | cancelling | cancelled`. The
  persisted one. This is what every filter and every guard uses.
- `subscriptionLifecycleStatuses` — `active | cancelledButActive | cancelled`.
  The pre-v4 derived vocabulary, kept because `shouldIncludeOccurrence` is
  consumed by `@subeye/spend`.

Comparing a value from one against a member of the other silently never matches.

`subscriptionStatuses` and `subscriptionAllowedActions` are *declared* in
`@subeye/model/src/types/enums.ts` and re-exported here: model's DTO schemas
validate against them with `picklist`, so they cannot live in a package model
imports. `subscriptionLifecycleStatuses` is declared here, in
`lifecycleStatus.ts`.

Both import paths reach the same objects. Import the persisted vocabulary from
`@subeye/model` — that is where it is declared, and the server's `pgEnum` is
built from it there.

## Invariants

- Transitions are PURE: `(record, args, now) → patch | null`. `null` means the
  transition is illegal for that record's current status; the caller turns that
  into a domain error. Never throw from this package.
- Cancellation outranks pause. A subscription that is both is cancelled.
- `pausedAt` is an INSTANT. `willBeCancelledAt` and `resumeAt` are CALENDAR DAYS.
  `deriveSubscriptionStatus` compares each against the right thing, and that is
  the entire reason it takes a `timezone`.
- `getAllowedActions` is the single source of truth for which actions are legal.
  The client renders it; it must never re-derive the rules.
- Renew clears the cancellation AND the pause. Clearing only one leaves a
  subscription that reads active and bills nothing.
- Every date leaving `transitions.ts` goes through the local `iso()` helper.
  `DateTimezoneUtils.toCalendarDay` hands back a `TZDate`, whose own
  `toISOString()` emits `…+00:00`; both clients slice and string-compare these
  as `Z`-form instants.

## Known inconsistency

`pause` guards on "already paused", not on "not active", so a `cancelling`
subscription can be paused through the service. `getAllowedActions` never offers
`pause` on `cancelling`, so no UI reaches it. Preserved as-is when the rule was
ported out of the server — tightening it is a deliberate behaviour change, not a
refactor.

## Tests

`bun test ./test` — `status.test.ts`, `allowedActions.test.ts`,
`transitions.test.ts`.

Every case in `transitions.test.ts` names an explicit timezone. Without one,
`currentCalendarDay` falls back to the process calendar and a day-boundary
assertion flips with `TZ` — two cases in `status.test.ts` did exactly that
before they were pinned to `"UTC"`. Run `TZ=Pacific/Auckland bun test ./test`
before trusting a new case.
