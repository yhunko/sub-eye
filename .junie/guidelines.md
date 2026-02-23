# SubEye Project Guidelines (Vite + Hono + Drizzle)

## 1. Architecture Overview

This project uses a Monorepo structure (`bhvr` template) with strict separation of concerns.

- **Client (`client/src/`)**: Strictly follows **Feature-Sliced Design (FSD)**.
- **Server (`server/src/`)**: Follows **Java-style Layered Architecture** (Controller, Service, Repository).
- **Shared (`shared/src/`)**: Contains DTO schemas (Valibot), Types, and Shared Utils.

**CRITICAL RULES:**

1. **NO LEAKAGE:**
   - `client` can import `shared`.
   - `server` can import `shared`.
   - **RPC INTERFACE:** The `client` MUST NEVER import from `server/src` directly. The ONLY allowed import from the server workspace is via the `@server/client` alias.
2. **NAMING CONVENTION:**
   - **Frontend:** strictly `kebab-case` (e.g., `user-profile.tsx`).
   - **Backend:** strictly `camelCase` (e.g., `userService.ts`).
3. **DEPENDENCY MANAGEMENT:**
   - Libraries used in both environments (e.g., `valibot`, `date-fns`) MUST be installed in the `shared` workspace.
4. **SHARED IMPORT STYLE:**
   - Import shared contracts/utilities from the `shared` package root (e.g., `import { SubscriptionDto } from "shared"`).
   - Do not use `@shared/*` aliases or deep `shared/*` paths in app code.
5. **DRY (DON'T REPEAT YOURSELF):**
   - If the same logic appears in more than one place, extract a shared helper/module and reuse it.
   - Prefer one authoritative implementation for each workflow to reduce drift and regression risk.

---

## 2. Monorepo Structure

```text
.
├── client/
│   ├── messages/         # i18n source files (en.json, etc.)
│   ├── project.inlang/   # i18n project config
│   └── src/              # React + Vite (PWA)
├── server/               # Hono (Bun/Node)
│   ├── src/
│   │   ├── index.ts      # Exports 'app' type
│   │   └── client.ts     # RPC Entry Point
├── shared/               # Shared logic & deps
```

---

## 3. Backend Guidelines (`server/src/`)

### Architecture: Java-Style Layers

(Controller, Service, Repository, Mapper layers).

### RPC Export (`server/src/client.ts`)

To maintain type safety without leaking implementation details:

```typescript
import { hc } from "hono/client";
import type { app } from "./index";

export type ServerRpcType = typeof app;
export type Client = ReturnType<typeof hc<ServerRpcType>>;

export const honoClient = (...args: Parameters<typeof hc>): Client =>
  hc<ServerRpcType>(...args);
```

---

## 4. Frontend Guidelines (`client/src/`)

### Architecture: Feature-Sliced Design (FSD)

Files in `client/src/` MUST use **`kebab-case`**.

### Internationalization (i18n)

We use **Paraglide (Inlang)**.

- **Source:** `client/messages/{locale}.json`.
- **Output:** `client/src/shared/lib/i18n` (Managed by Vite plugin).
- **Format:** Flat JSON.
- **Key Convention:** `context_component_label` (snake_case grouping + camelCase identifiers).
  - Example: `form_billingInfo_title`, `messages_confirmDelete`.
- **Imports:**
  - Messages: `import * as m from "@/i18n/messages"`
  - Runtime: `import { ... } from "@/i18n/runtime"`

**Example `en.json`:**

```json
{
  "$schema": "[https://inlang.com/schema/inlang-message-format](https://inlang.com/schema/inlang-message-format)",
  "form_billingInfo_title": "Billing Info",
  "messages_confirmDelete": "Are you sure you want to delete {name}?"
}
```

### Configuration & Aliases

**`client/tsconfig.app.json` Paths:**

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/i18n/messages": ["./src/shared/lib/i18n/messages/_index"],
      "@/i18n/runtime": ["./src/shared/lib/i18n/runtime"],
      "@server/client": ["../server/src/client"]
    }
  }
}
```

**`client/vite.config.ts`:**
Ensures Paraglide and TanStack Router generation.

```typescript
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/shared/lib/i18n",
      emitTsDeclarations: true,
      cleanOutdir: true,
    }),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./src/pages",
      generatedRouteTree: "./src/app/routes/routeTree.gen.ts",
      routeFileIgnorePrefix: "-",
      quoteStyle: "double",
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      "@server/client": path.resolve(__dirname, "../server/src/client"),
    },
  },
});
```

### Data Fetching

Use **TanStack Query** wrapping **Hono RPC**.
We export **`queryOptions`** factories instead of hooks for flexibility (usage in `useQuery`, `useSuspenseQuery`, or loaders).

**1. RPC Client Setup**

```typescript
// client/src/shared/api/client.ts
import { honoClient } from "@server/client";

export const apiClient = honoClient(import.meta.env.VITE_API_URL, {
  fetch: (input, init) => fetch(input, { ...init, credentials: "include" }),
});
```

**2. Query Factory Example**

```typescript
// client/src/entities/analytics/api/dashboard-analytics-query.ts
import { queryOptions } from "@tanstack/react-query";
import type { DashboardAnalyticsDto } from "shared";
import type { QueryHook } from "@/shared/lib/react-query/types";
import { analyticsQueryKeys } from "../model/query-keys";
import { apiClient } from "@/shared/api/client";

type DashboardAnalyticsParams = { userId: string };

export function dashboardAnalyticsQuery({
  params,
  options,
}: QueryHook<DashboardAnalyticsDto, DashboardAnalyticsParams>) {
  const { userId } = params;

  return queryOptions({
    queryKey: analyticsQueryKeys.dashboard({ userId }).queryKey,
    queryFn: async () => {
      const res = await apiClient.api.analytics.dashboard.$get();
      if (!res.ok) {
        throw new Error("Failed to fetch dashboard analytics");
      }
      return res.json();
    },
    ...options,
    enabled: options?.enabled ?? Boolean(userId),
  });
}
```

**3. Usage in Component**

```typescript
// Standard
const { data } = useQuery(
  dashboardAnalyticsQuery({ params: { userId: "123" } }),
);

// Suspense
const { data } = useSuspenseQuery(
  dashboardAnalyticsQuery({ params: { userId: "123" } }),
);
```

---

## 5. Shared Workspace (`shared/src/`)

**Purpose:** Unified DTOs (`valibot`) and utils to prevent client/server schema mismatch.

---

## 6. Database & Schema

- **File:** `server/src/db/schema.ts`
- **Naming:** Tables/Columns: `snake_case`. TypeScript objects: `camelCase`.

---

## 7. Summary of Naming Conventions

| Context            | Case Style    | Example                  | Reason                  |
| :----------------- | :------------ | :----------------------- | :---------------------- |
| **Frontend Files** | `kebab-case`  | `user-card.tsx`          | FSD / React standard    |
| **Backend Files**  | `camelCase`   | `userService.ts`         | Node/JS Standard        |
| **DB Tables/Cols** | `snake_case`  | `is_active`              | PostgreSQL Standard     |
| **i18n Keys**      | `snake+camel` | `form_billingInfo_label` | Context grouping        |
| **Classes**        | `PascalCase`  | `UserService`            | OOP Standard            |
| **Methods**        | `camelCase`   | `getById`                | JS Standard             |
| **RPC Import**     | -             | `@server/client`         | Strict layer separation |

---

## 8. Push Notifications Best Practices

### Server Delivery Rules

- Do not rely on one-time module initialization for VAPID setup.
  - Resolve and validate `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, and `VAPID_PRIVATE_KEY` per send operation.
  - `VAPID_SUBJECT` must start with `mailto:` or `https://`.
- Send methods must return a delivery report (`attempted`, `delivered`, `failed`, `removed`, `failures`) instead of swallowing per-device failures.
- Parse non-2xx push responses and log provider reason text (when available). Silent errors make scheduled workflow failures hard to diagnose.

### Subscription Hygiene

- Remove stale subscriptions automatically on:
  - `404 Not Found`
  - `410 Gone`
  - Known stale-token `403` reasons (provider-specific invalid token/device-token errors)
- Keep delivery logs structured with `userId`, `subscriptionId` (if applicable), and failure details.

### Endpoint Behavior

- Test endpoint (`POST /api/push-notifications/test`) must return an error status when no subscriptions receive the notification (even if send attempts were made).
- Scheduled workflow notifications must record/report delivery failures so scheduler issues are visible in logs and observability.

### Fix Applied (2026-02-23)

- `PushNotificationService.sendNotification` now:
  - Validates VAPID config per request.
  - Returns a structured delivery report.
  - Extracts provider error reason from response bodies.
  - Cleans stale subscriptions for 404/410 and known stale 403 cases.
- `POST /api/push-notifications/test` now returns `502` when all delivery attempts fail.
- `SubscriptionNotificationsWorkflow` now logs delivery reports for scheduled sends when failures occur.

---

## 9. Plan Gating (Free vs Pro)

### Notification Schedule Entitlement

- Treat notification scheduling customization as a **Pro-only** capability.
- Free plan still supports push notifications, but schedule is fixed and must be enforced server-side:
  - `notificationOffset = 1` (one day before)
  - `notificationTime = "10:00"`
  - Time should be interpreted in the user's `preferredTimezone`.

### Enforcement Rules

- Never rely only on UI for gating; enforce on server metadata writes and reads.
- If a free user already has custom schedule metadata (legacy dev/prod users), normalize/reset metadata to free defaults automatically.
- Scheduled workflow logic must consume normalized preferences so free users cannot bypass with stale metadata.

### Contracts for Agents

- `PlanUsage` should include plan and feature flags (not only limits), so UI can lock features predictably.
- Use shared billing feature keys and helpers (`notificationSchedule`) instead of ad-hoc string checks.
- Billing page should show that custom notification schedule is unavailable on Free and included in Pro preview.
