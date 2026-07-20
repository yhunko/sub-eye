# Server — Pricing Phases Guidelines

The pricing-phase model is the core of the server. It decides what a user is
charged and when, so bugs here are silently wrong money. Read this before
touching `subscriptionPhaseService.ts` or `subscriptionPricePhaseRepository.ts`.

---

## The model

A subscription's price over time is a schedule of ordered rows in
`subscription_price_phases`. Each phase has a `kind`
(`trial | intro | scheduledChange | standard`), a `cost`, a `startsAt`, an
optional `endsAt`, and a nullable `appliedAt`.

The `subscriptions` row's own `cost`/`currency` stay **authoritative for what
the user pays right now**. Phases describe the transitions around that value —
they do not replace it. Applying a phase means copying its price onto the
subscription row.

| File | Role |
| --- | --- |
| `src/domains/subscription/subscriptionPhaseService.ts` | All phase logic — create, cancel, apply, reconcile |
| `src/domains/subscription/subscriptionPricePhaseRepository.ts` | Phase persistence; owns `db` |
| `src/domains/subscription/subscriptionService.ts` | Subscription CRUD; calls the phase service |
| `packages/shared/src/domains/subscription/subscriptionLifecycle.ts` | Derives lifecycle status from `willBeCancelledAt` |

---

## Invariants — do not break these

### `appliedAt` is the idempotency anchor

`applyPhaseByWorkflow` and `applyBoundaryBatch` are **no-ops once `appliedAt` is
set**. This is what makes the apply path safe to call repeatedly from any
number of entry points. Never apply a phase without checking `appliedAt` first,
and never clear it.

### Phases are applied lazily, on read

There is no scheduler. The list read (`GET /subscriptions`) is pure: it loads
phase rows via `loadPhasesFor` and never writes. The single-subscription read
(`GET /subscriptions/:id`) is the one read allowed to write — it calls
`applyDuePhases`, which finds phases whose `startsAt` has passed and whose
`appliedAt` is null (`selectDuePhases`) and settles them via
`applyPhaseByWorkflow`.

This means **a phase boundary fires the next time the user opens that
subscription, not at the instant it comes due.** That is the intended v4
behaviour. Do not reintroduce a scheduler, and do not move writes onto the
list read.

### `db.batch`, never `db.transaction`

Neon's `neon-http` driver has **no interactive transactions** —
`db.transaction()` throws at runtime. `applyPhase` uses
`deps.phaseRepository.applyBoundaryBatch(...)` to group its writes atomically.
Any new multi-statement group that must be atomic uses `db.batch([...])`.

### Services take a `deps` param; repositories own `db`

`SubscriptionPhaseServiceDeps` is
`{ repository, phaseRepository, currencyService, userService }`,
defaulting to the real implementations. Tests pass fakes. Services must not
import `db` directly — that is the repository's job, and repositories are
leaves (they never import a service).

---

## Adding a new phase kind

1. Add the value to `pricePhaseKindEnum` in `src/db/schema.ts` and to the
   Valibot schema in `packages/shared/.../pricePhaseSchemas.ts`.
2. Decide how `startPricingSchedule` lays it down — most kinds are "override
   phase now + `standard` phase after `endsAt`".
3. Make sure `applyDuePhases` can settle it: it must have a `startsAt` and a
   null `appliedAt`.
4. Add a case to `test/subscription-phase-service.test.ts`.
