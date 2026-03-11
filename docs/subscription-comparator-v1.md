# Subscription Comparator v1

## Overview

Comparator v1 adds a responsive multi-step flow for comparing subscription pricing before switching plans or providers.

- UI route: `/subscriptions/compare`
- Backend endpoints:
- `GET /api/comparator/quota`
- `POST /api/comparator/compare`

## Backend Architecture

Comparator is implemented in the existing Hono + TypeScript backend and follows Java-style layering:

- Route/controller: HTTP boundary, auth, validation, response mapping.
- Service: orchestration (source plan resolution, quota enforcement, pricing/rates, portfolio context).
- Repository: comparator quota persistence.
- Calculator: pure comparison math and derived metrics.

No Java runtime or Java service is introduced.

## Supported Flows (v1)

- Existing tracked subscription vs manual candidate plan.
- Manual plan vs manual plan.

## Result Model

The result includes:

- Normalized monthly impact.
- Normalized yearly impact.
- Percentage delta.
- Cash-flow view (per-charge amount now vs candidate).
- Light portfolio context:
- current tracked monthly total
- projected tracked monthly total after applying delta

## Quota Policy

- Free plan: 3 comparisons per month.
- Plus plan: unlimited.
- Quota window is calculated from user timezone and resets at next month start.
- Quota is enforced server-side with atomic DB update semantics.

## Persistence Scope

v1 is non-persistent for comparison scenarios/results:

- No saved comparison history.
- No share links.
- These are phase 2 candidates.

## Error Semantics

Comparator returns structured errors:

- `401` unauthorized
- `400` invalid payload (schema validation)
- `403` free quota exceeded
- `404` referenced existing subscription not found/user-inaccessible
- `500` unexpected server error

## Quality Commands

Use workspace-scoped command format:

```bash
bun run --cwd shared type-check
bun run --cwd shared build
bun run --cwd server type-check
bun run --cwd server test
bun run --cwd client type-check
bun run --cwd client test
```
