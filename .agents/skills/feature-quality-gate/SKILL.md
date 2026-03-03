---
name: feature-quality-gate
description: Perform a full-feature quality gate for current uncommitted changes. Use when developing a new feature, refactoring, or before committing to enforce top-tier React + FSD architecture, PWA performance, request caching strategy, and Hono layered backend design (route/controller -> service -> repository), then apply fixes and re-validate.
---

# Feature Quality Gate

Treat all uncommitted changes as one feature-in-progress and raise quality to production level before commit.

## Workflow

1. Identify scope

- Run `git status --short` and `git diff --name-only`.
- Group files by layers: frontend (`client`), backend (`server`), shared contracts (`shared`), migrations.

2. Review before editing

- Prioritize correctness, architecture boundaries, performance, and maintainability.
- List concrete findings ordered by severity (`P1`, `P2`, `P3`) with file references.

3. Fix issues end-to-end

- Apply changes, not only recommendations.
- Keep behavior stable unless a bug fix is intentional.
- Preserve existing conventions and naming.

4. Validate

- Run project quality checks and fix failures.
- Re-run until clean or until only acknowledged pre-existing warnings remain.

5. Report gate result

- Provide: findings fixed, validations run, remaining risks, and optional next actions.

## Frontend Gate (React + FSD + PWA)

### Architecture (FSD)

- Keep imports flowing from higher layers to lower layers.
- Avoid moving domain logic into UI-heavy components.
- Extract duplicated logic into shared entity/feature helpers.
- Keep large files split by responsibility (types, model logic, formatters, components, orchestration).

### React quality

- Keep render paths cheap.
- Memoize expensive derivations.
- Avoid unnecessary state and avoid broad re-renders.
- Prefer lazy-loading for secondary/heavy UI (dialogs, panels, route-level blocks).
- All dialogs must be lazy-loaded and opened via `nice-modal-react` (`NiceModal.show`); avoid mounting dialog trees inline in page-level components.
- Keep async states explicit (loading, empty, error).
- Avoid using complex, custom tailwind classes. Prefer clean, shadcn/ui native components design. Overwrite shadcn/ui components with custom styles sparingly, and ONLY when absolutely necessary.
- Avoid nested ternary expressions in JSX/TSX render blocks. Prefer explicit render helpers or a typed strategy map instead.

### Request caching (TanStack Query)

- Use deterministic query keys, scoped to required identity (for example, include `userId` when data is user-scoped).
- Prefer `queryOptions` factories for reusable query behavior.
- Set explicit `enabled`, `staleTime`, and `gcTime` where useful.
- Invalidate precisely after mutations; avoid broad invalidation when targeted invalidation is possible.
- Keep optimistic updates only when rollback is defined.

### PWA performance

- Protect first-load performance: limit eager code in critical path.
- Avoid expensive computations on each render.
- Keep large lists/panels scalable.
- Prefer resilient UX for unstable network conditions (retry paths and meaningful fallbacks).

## Backend Gate (Hono + Layered Service Architecture)

### Layering

- Keep routes/controllers thin: parse input, call service, map errors to HTTP.
- Keep business rules in service layer.
- Keep data access in repository layer only.
- Do not leak DB/query details into routes.

### Correctness and security

- Enforce ownership/authorization in service-level methods.
- Validate all external inputs at route boundaries.
- Return domain-level errors mapped consistently to status codes.

### Repository and DB

- Use typed DB interfaces, avoid `any` for repository transaction/db params.
- Align query filters with ownership constraints (for example, `subscriptionId + userId`).
- Add indexes for real access patterns introduced by the feature.
- Keep migrations synchronized with schema changes.

## Shared Contracts Gate

- Centralize cross-layer constants and DTO contracts in `shared`.
- Avoid duplicating business constants across FE/BE.
- Export shared contracts through domain indexes where appropriate.

## Maintainability Rules

- Remove dead code and stale branches while refactoring.
- Prefer small pure helpers for transformations/formatting.
- Keep functions focused and names explicit.
- Avoid repeated literals and repeated mapping logic.

## Required Validation Commands

Run at minimum:

```bash
bun run react-doctor
bun run type-check
bun run lint
```

If tests exist for touched areas, also run:

```bash
bun run test
```

If a command fails due unrelated pre-existing warnings, call that out explicitly and continue fixing feature-related issues.

## Output Contract

Return results in this order:

1. Findings (ordered by severity) with file references.
2. Changes applied to resolve findings.
3. Validation summary (commands + outcome).
4. Residual risks/gaps (if any).

Do not stop at analysis if fixes are feasible in the current turn.

## Additional tools available

MCPs:

- jetbrains - IDE realted functionality. Review files, files issues, etc.
- context7 - Up to date developer documentations. Always use Context7 when I need library/API documentation, code generation, setup or configuration steps without me having to explicitly ask.
- shadcn - shadcn/ui UI component library. Use shadcn when I need UI components or customizations.
- Clerk - Authentication and authorization provider in the app.

Useful skills:

- [$frontend-design](../frontend-design/SKILL.md)
- [$find-skills](../find-skills/SKILL.md)
- [$clerk](../clerk/SKILL.md)
- [$clerk-setup](../clerk-setup/SKILL.md)
- [$tailwind-design-system](../tailwind-design-system/SKILL.md)
- [$vercel-react-best-practices](../vercel-react-best-practices/SKILL.md)
- [$web-design-guidelines](../web-design-guidelines/SKILL.md)
