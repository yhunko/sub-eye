# SubEye Project Guidelines

## 1. Architecture Overview

This project follows a strict separation of concerns using two primary architectural patterns:

- **Frontend (FE):** [Feature-Sliced Design (FSD)](https://feature-sliced.design/docs/get-started/tutorial)
- **Backend (BE):** Java-like layered architecture (Controller-Service-Repository)

### Frontend (FSD)

- **Shared:** Reusable components, hooks, and libraries without business logic.
- **Entities:** Business entities (e.g., `subscription`, `user`, `analytics`). Contains internal logic, state, and API
  hooks.
- **Features:** User-facing scenarios that bring business value (e.g., `add-subscription-form`).
- **Widgets:** Complex UI blocks composed of entities and features.
- **Pages:** Full pages composed of widgets and features.
- **App:** Global initialization (providers, styles).

### Backend (Java-like Layered Architecture)

All backend logic resides within `src/entities/<entity>/lib` and `src/entities/<entity>/repository`.

- **Controllers:** Entry points for server actions. Handle request orchestration.
- **Services:** Core business logic. Orchestrate repositories and other services.
- **Repositories:** Data access layer. Direct interaction with Drizzle ORM.
- **Mappers:** Transform database schemas into DTOs and vice versa.
- **DTOs:** Data Transfer Objects for communication between BE and FE.

## 2. Backend Guidelines

### Controllers

- Should be thin.
- Responsibilities: Input extraction, calling services, returning results.
- Located in `src/entities/<entity>/lib/<entity>.controller.ts`.

### Services

- Contain the "meat" of the application logic.
- Should be stateless where possible.
- Use private helper methods for repeated logic.
- Use `DateTimezoneUtils.now(timezone)` for time-sensitive logic to respect user preferences.
- Located in `src/entities/<entity>/lib/<entity>.service.ts`.

### Repositories

- Encapsulate all database queries using Drizzle ORM.
- Should not contain business logic.
- Located in `src/entities/<entity>/repository/<entity>.repository.ts`.

### Server Actions

- Located in `src/entities/<entity>/api/actions.ts`.
- Use `Sentry.withServerActionInstrumentation` for observability.
- Perform authentication checks using Clerk's `auth()`.
- Instantiate controllers to execute logic.

## 3. Frontend Guidelines

### Components & UI

- Use **shadcn/ui** components located in `src/shared/components/ui`.
- All shared UI components must be re-exported through `src/shared/components/index.ts`.
- Prefer composition over large, complex components.
- Use `cn()` utility for conditional tailwind classes.

### Data Fetching (TanStack Query)

- Use `createQueryKeys` from `@lukemorales/query-key-factory` for consistent query key management.
- Define hooks in `src/entities/<entity>/api/hooks.ts`.
- Handle `isLoading`, `isError`, and `isSuccess` states explicitly.
- Use `keepPreviousData` for smoother pagination/filtering transitions.

### Forms

- Use `react-hook-form` with `valibot` for schema validation.
- Define schemas in `model/schema.ts` within the feature or entity.

## 4. Database & ORM (Drizzle)

- Define schemas in `src/shared/lib/db/schemas/`.
- Use `pgTable` and standard PostgreSQL types.
- Maintain `updatedAt` using `defaultNow()` and manual updates in repositories.
- Types: Use `$inferSelect` and `$inferInsert` for schema-derived types.

## 5. Authentication (Clerk)

- Use `ConfiguredClerkProvider` for global setup.
- FE: Use `useUser()` or `useAuth()` hooks.
- BE: Use `auth()` (async in Next.js 16/Clerk v6) to get `userId` and `isAuthenticated`.
- User preferences (metadata) should be managed via `UserService`.

## 6. Internationalization (next-intl)

- Use `useTranslations` hook on FE.
- Translation files are in `src/features/i18n/model/messages/<locale>/`.
- Standard namespaces: `common`, `subscription`, `analytics`, etc.

## 7. State Management

- **Server State:** TanStack Query.
- **URL State:** Use `nuqs` for managing search parameters (filters, sorting, etc.).
- **Global UI State:** Prefer local state or context providers for specific modules.

## 8. Coding Standards & Best Practices

- **DRY:** Extract common logic into utils or shared components.
- **Clean Code:** Use descriptive naming, small functions, and clear structure.
- **SOLID:** Adhere to Single Responsibility and Dependency Inversion (e.g., passing services into constructors).
- **Timezones:** Always consider the user's `preferredTimezone` for date calculations.
- **Currencies:** Use `CurrencyUtils` for conversions and `CurrencyText` for display.

## 9. Tools & Ecosystem

- **Runtime:** Bun
- **Styles:** Tailwind CSS 4
- **Date Handling:** `date-fns` and `@date-fns/tz`
- **Charts:** `recharts`
- **PWA:** `serwist`
- **Observability:** Sentry & PostHog
- **Background Jobs:** Upstash QStash
- **CI/CD:** Husky, Lint-staged, Semantic Release
- **Serwist** for managing service workers. Located in: `src/shared/lib/serwist`.
