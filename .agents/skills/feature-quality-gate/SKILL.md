---
name: feature-quality-gate
description: Full quality gate for uncommitted changes. Run after completing a feature, before committing. Covers React + FSD architecture, Hono layered backend, shared contracts, migrations, caching, and PWA. Detects, fixes, and validates issues end-to-end.
---

# Feature Quality Gate

## Severity Definitions

| Level | Meaning                                           | Blocks commit? |
| ----- | ------------------------------------------------- | -------------- |
| P1    | Correctness, security, or architectural violation | Yes            |
| P2    | Maintainability, missing test, performance risk   | Yes            |
| P3    | Style, naming, minor improvement                  | No             |

Gate passes only when: all validation commands exit clean, zero P1/P2 findings remain open.

---

## Step 1 — Scope

```bash
git diff --name-only
```

Group changed files into touched layers: `client`, `server`, `shared`, `migrations`.  
Only run gate sections and validation commands for touched layers.

---

## Step 2 — Review Findings

Produce a flat list ordered P1 → P3 with file references before editing anything.

---

## Step 3 — Fix

Apply all P1 and P2 fixes directly. Do not leave recommendations without implementation.  
Keep behavior stable unless the fix is intentional. Match existing conventions.

---

## Step 4 — Validate

Run the narrowest applicable set. Escalate if cross-workspace impact is found.

| Touched layer   | Commands                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------- |
| `client`        | `bun --cwd client run type-check` · `bun run react-doctor` · `bun --cwd client run test` |
| `server`        | `bun --cwd server run type-check` · `bun --cwd server run test`                          |
| `shared`        | `bun --cwd shared run type-check` · `bun --cwd shared run build`                         |
| Cross-workspace | `bun run lint` · `bun run type-check` · `bun run test`                                   |

Fix all failures. If a failure is a known pre-existing issue unrelated to this feature, call it out explicitly and continue.

---

## Step 5 — Report

Return in order:

1. Findings (P1→P3, with file refs)
2. Changes applied
3. Validation summary (command + exit status)
4. Residual risks (if any)

---

## Client Gate (React + FSD)

### Architecture

- Imports flow higher → lower layers only (`pages → widgets → features → entities → shared`).
- No domain logic in JSX-heavy components; extract to entity/feature helpers.
- Large mixed-concern files must be split by responsibility (types, model, formatters, component, orchestration).

### React

- No unnecessary state; no broad re-renders.
- Memoize only genuinely expensive derivations.
- Secondary/heavy UI (dialogs, panels, route blocks) must be lazy-loaded.
- All dialogs opened via `NiceModal.show`; no inline modal trees in page components.
- Async states must be explicit: loading, empty, error.
- No nested ternaries in JSX; use render helpers or typed strategy maps.
- No complex custom Tailwind chains; prefer native shadcn/ui patterns. Override sparingly and only when necessary.

### TanStack Query

- Query keys must be deterministic and identity-scoped (include `userId` for user-scoped data).
- Use `queryOptions` factories for reusable queries.
- Set `staleTime`, `gcTime`, and `enabled` explicitly where relevant.
- Mutations must invalidate precisely; no broad cache invalidation when targeted is possible.
- Optimistic updates require a defined rollback.

### PWA

- No expensive computation in critical render path.
- Large lists must be scalable (virtualize if unbounded).
- Provide retry paths and meaningful fallbacks for unstable network conditions.

---

## Server Gate (Hono + Layered Architecture)

### Layering

- Routes/controllers: parse input, call service, map errors to HTTP. Nothing else.
- Services: business rules and orchestration only.
- Repositories: all persistence and queries. No DB details leak into services or routes.

### Correctness and Security

- Ownership/authorization enforced at service layer.
- All external input validated at route boundary.
- Domain errors mapped consistently to HTTP status codes.
- Secrets in env vars only; never in responses or logs.

### Repository and DB

- No `any` for DB/transaction params; use typed interfaces.
- Queries must align with ownership constraints (e.g. `userId + resourceId`).
- New access patterns introduced by the feature require a corresponding index.

---

## Migrations Gate

- Schema changes must have a corresponding migration.
- No destructive changes (column drops, renames) without a guard or explicit acknowledgment.
- Migration SQL identifiers in `snake_case`.
- Verify migration is in sync with current ORM schema.

---

## Shared Gate

- Only contracts, schemas, enums, constants, and pure utilities in `shared`.
- No runtime client/server internals imported into `shared`.
- No constants duplicated across `client` and `server`; canonical definition lives in `shared`.
- Exports via package root; no deep-path imports.

---

## Test Requirement

Any new logic in a service, repository, or custom hook must have at least one test added or extended.  
Missing test coverage for new logic is a P2 finding.

---

## Code Style Invariants (apply everywhere)

- No dead code or stale branches left after a refactor.
- No repeated literals or duplicated mapping logic; extract once.
- Names must be explicit and self-documenting.
- Comments only for non-obvious logic or important invariants.
- No heavy new dependencies without clear, documented justification.
