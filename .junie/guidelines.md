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
   - **RPC INTERFACE:** The `client` MUST NEVER import from `server/src` directly. The ONLY allowed import from the server workspace is via the `@server/client` alias, which exposes the RPC types and the configured client factory.
2. **NAMING CONVENTION:**
   - **Frontend:** strictly `kebab-case` (e.g., `user-profile.tsx`).
   - **Backend:** strictly `camelCase` (e.g., `userService.ts`) to maintain JS/Node standards.
3. **DEPENDENCY MANAGEMENT:**
   - Libraries used in both environments (e.g., `valibot`, `date-fns`) MUST be installed in the `shared` workspace to ensure version consistency.

---

## 2. Monorepo Structure

```text
.
├── client/               # React + Vite (PWA)
├── server/               # Hono (Bun/Node)
│   ├── src/
│   │   ├── index.ts      # Exports 'app' type
│   │   └── client.ts     # RPC Entry Point for Frontend
├── shared/               # Shared logic & deps
```

---

## 3. Backend Guidelines (`server/src/`)

### Architecture: Java-Style Layers

(Controller, Service, Repository, Mapper layers remain as previously defined).

### RPC Export Mechanism (`server/src/client.ts`)

To maintain type safety without leaking implementation details, the server provides a dedicated client entry point.

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

### Data Fetching & RPC

We use **TanStack Query** wrapping **Hono RPC**. The client is initialized using the factory provided by the server workspace.

**1. RPC Client Setup (`client/src/shared/api/client.ts`)**
Import only from the allowed `@server/client` path.

```typescript
import { honoClient } from "@server/client";

export const client = honoClient(import.meta.env.VITE_API_URL, {
  fetch: (input: RequestInfo | URL, init?: RequestInit) =>
    fetch(input, {
      ...init,
      credentials: "include",
    }),
});
```

**2. Entity Hook (`client/src/entities/user/api/use-user.ts`)**

```typescript
import { useQuery } from "@tanstack/react-query";
import { client } from "@/shared/api/client";

export function useUser() {
  return useQuery({
    queryKey: ["user", "me"],
    queryFn: async () => {
      // client.$api... provides full type safety via ServerRpcType
      const res = await client.api.users.me.$get();
      if (!res.ok) throw new Error("Failed to fetch");
      return await res.json();
    },
  });
}
```

---

## 5. Shared Workspace (`shared/src/`)

**Purpose:** Manage versions and share DTOs. Ensure `valibot` and other logic are unified here to prevent schema mismatch between client and server.

---

## 6. Database & Schema

- **File:** `server/src/db/schema.ts`
- **Naming:** Tables/Columns: `snake_case`. TypeScript objects: `camelCase`.

---

## 7. Summary of Naming Conventions

| Context            | Case Style   | Example          | Reason                   |
| :----------------- | :----------- | :--------------- | :----------------------- |
| **Frontend Files** | `kebab-case` | `user-card.tsx`  | Standard React/FSD style |
| **Backend Files**  | `camelCase`  | `userService.ts` | Node/JS Standard         |
| **DB Tables/Cols** | `snake_case` | `is_active`      | PostgreSQL Standard      |
| **Classes**        | `PascalCase` | `UserService`    | OOP Standard             |
| **Methods**        | `camelCase`  | `getById`        | JS Standard              |
| **RPC Import**     | -            | `@server/client` | Strict layer separation  |
