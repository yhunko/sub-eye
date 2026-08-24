# @subeye/server — API guidelines

Hono on a single Cloudflare Worker. Neon Postgres via Drizzle, Clerk auth.
`src/index.ts` mounts every router under the `/api` base path; see
[README.md](README.md) for the route surface, env bindings, and db commands.

```
src/domains/<domain>/   service + repository per domain
                        (analytics, category, currency, subscription, user)
src/routes/             Hono routers — validation + delegation, no logic
src/db/                 schema.ts + the Drizzle client
src/middleware/         auth, error mapping
```

**Layering:** routes → services → repositories. A repository owns `db` and is a
leaf — it never imports a service. `bun run check:boundaries` fails the build on
a violation (`server-repository-is-leaf`).

Most of this file is about pricing phases, because that is where the sharp edges
are.

---

## Pricing phases

The pricing-phase model is the core of the server. It decides what a user is
charged and when, so bugs here are silently wrong money. Read this before
touching `subscriptionPhaseService.ts` or `subscriptionPricePhaseRepository.ts`.

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
| `packages/model/src/domains/subscription/subscriptionLifecycle.ts` | Derives lifecycle status from `willBeCancelledAt` |

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

## Tests

`bun test ./test` — unit tests over fake repositories. Nothing here talks to
Postgres.

The `test` script pins a placeholder `DATABASE_URL` when the environment has
none. Every service reaches a repository, every repository imports
`src/db/index.ts`, and that module **throws at import** on a missing
`DATABASE_URL` — so without the placeholder the suite dies during module
evaluation and reports a cascade of `Cannot access 'X' before initialization`,
even though no test issues a query. A real value still wins, and the Worker
keeps its fail-loudly-at-boot behaviour.

**A local pass proves less than it looks.** `apps/server/.env` supplies
`DATABASE_URL`, so the suite goes green locally whether or not the placeholder
is there; CI has no `.env` and is the only place the difference shows. Turbo
caches `test`, so a cache hit can also replay a green log for code that would
fail if it actually ran — `turbo test --force` is what checks the claim.

---

## Adding a new phase kind

1. Add the value to `pricePhaseKindEnum` in `src/db/schema.ts` and to the
   Valibot schema in `packages/model/.../pricePhaseSchemas.ts`.
2. Decide how `startPricingSchedule` lays it down — most kinds are "override
   phase now + `standard` phase after `endsAt`".
3. Make sure `applyDuePhases` can settle it: it must have a `startsAt` and a
   null `appliedAt`.
4. Add a case to `test/subscription-phase-service.test.ts`.
