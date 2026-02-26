---
trigger: always_on
---

# SubEye Engineering Guidelines

## 1) Monorepo boundaries

- Workspaces:
  - `client/`: React + Vite PWA, Feature-Sliced Design (FSD)
  - `server/`: Hono API with layered architecture (route/controller -> service -> repository)
  - `shared/`: cross-workspace contracts, schemas, and pure utilities
- Allowed imports:
  - `client` -> `shared`
  - `server` -> `shared`
  - `client` -> server only through `@server/client` RPC alias
- Never import `server/src/*` directly from client code.

## 2) Naming and file layout

- Frontend files: `kebab-case`.
- Backend files: `camelCase`.
- DB tables/columns: `snake_case`.
- TS identifiers: `camelCase`; types/classes/components: `PascalCase`.
- Keep files focused. If a file grows large or mixes concerns, split it by responsibility (view/components, domain logic, formatting, constants, types).

## 3) Shared contracts and schemas

- Define request/response DTOs and domain schemas in `shared`.
- Import shared contracts from package root (`import { X } from "shared"`).
- Avoid deep shared imports and duplicate schema definitions across workspaces.
- Avoid any shared logic / utils etc. duplication

## 4) Frontend architecture (FSD)

- Respect FSD boundaries: pages compose features; features compose entities/shared.
- Keep business logic out of JSX-heavy components.
- Extract repeated logic into reusable modules/hooks/components.
- Favor composition over large monolithic components.

## 5) React and performance defaults

- Keep render functions lightweight; memoize expensive derivations with `useMemo`.
- Use stable callbacks only when needed (`useCallback` for memoized child boundaries).
- Avoid unnecessary re-renders: colocate state, split components by update frequency.
- Lazy-load heavy/secondary UI (dialogs, panels, routes).
- Virtualize long lists when item count can grow.
- Prefer lightweight dependencies and tree-shakeable imports.

## 6) PWA performance and resilience

- Keep initial bundle small: route-level code splitting and async component loading.
- Cache static assets aggressively; network/cache strategy should prioritize fast repeat visits.
- Version service worker updates safely; avoid stale UI/data traps.
- Handle offline/poor network states gracefully (skeletons, retries, fallback copy).
- Keep critical flows usable under flaky connectivity.

## 7) Data fetching and state

- Use TanStack Query for server state.
- Use deterministic query keys from centralized key factories.
- Keep query functions side-effect free; mutations own invalidation/update rules.
- Prefer optimistic updates only when rollback path is defined.
- Set sensible stale/cache times for perceived performance.

## 8) DRY and maintainability

- If logic appears in more than one place, extract one authoritative implementation.
- Keep formatter/date/currency/action-label logic centralized.
- Prefer small pure functions for domain transformations.
- Delete dead code and unused branches while refactoring.

## 9) Backend and database

- Enforce layering: routes/controllers are thin; services hold business rules; repositories handle persistence.
- Validate inputs at boundaries; never trust client payloads.
- Keep migrations forward-only, reviewed, and reproducible.
- Index for real query patterns; avoid N+1 and unbounded queries.

## 10) i18n and formatting

- Source messages in `client/messages/{locale}.json`.
- Use stable, descriptive keys and keep translations semantically aligned.
- Do not hardcode user-facing strings in components.
- Centralize locale-aware formatting (dates, currency, relative time).

## 11) Accessibility and UX quality

- Preserve semantic HTML and keyboard navigation.
- Ensure interactive controls have labels/aria text.
- Keep color contrast and focus states accessible.
- Provide loading, empty, and error states for async UI.

## 12) Security and privacy

- Validate and sanitize all external input.
- Keep auth/session checks server-side.
- Never leak secrets to client bundles.
- Avoid logging sensitive user data.

## 13) Testing and review bar

- Add/update tests for non-trivial logic and regressions.
- Refactors must preserve behavior and reduce complexity.
- Run relevant checks before finishing (types, tests, lint, project quality tools).
- Review for readability first: clear naming, small functions, explicit boundaries.

## 14) Agent rules

- Prefer minimal, high-signal changes.
- Keep guidelines and duplicated policy files in sync when both exist.
- When introducing new patterns, document them briefly in-place or in project docs.
