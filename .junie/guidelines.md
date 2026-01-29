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
    - `client` MUST NEVER import from `server` (RPC types are inferred, not imported directly from implementation files).
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
├── shared/               # Shared logic & deps
│   ├── package.json      # exports: valibot, date-fns
│   └── src/
│       ├── index.ts
│       ├── schemas/      # Valibot DTOs
│       └── types/        # TypeScript Interfaces
```

---

## 3. Backend Guidelines (`server/src/`)

### Architecture: Java-Style Layers

The backend is organized into **Domains** (packages). Within each domain, use Scoped Classes with static methods.

**Directory Structure:**

```text
server/src/
├── index.ts               # App Entry (Hono Instance)
├── db/                    # Drizzle Setup
│   ├── index.ts           # DB Connection
│   └── schema.ts          # DB Tables
├── domains/               # "Packages"
│   ├── user/
│   │   ├── userMapper.ts
│   │   ├── userRepository.ts
│   │   └── userService.ts
│   └── subscription/
└── routes/
    └── users.ts           # Controller (Public API)
```

### Layer Definitions

1. **Controller Layer** (`routes/<name>.ts`)
    - **Role:** The Public API Entry Point (Hono Route).
    - **Responsibilities:**
        - Defines route paths (e.g., `.post('/', ...)`).
        - Validates inputs using **Valibot**.
        - Returns strictly typed JSON (for RPC).
        - Delegates work to the **Service**.
    - **Naming:** Plural nouns (e.g., `users.ts`).

2. **Service Layer** (`domains/<name>/<name>Service.ts`)
    - **Role:** Business Logic.
    - **Responsibilities:**
        - Orchestrates multiple Repositories.
        - Handles logical validation (e.g., "User already exists").
        - Throws business exceptions.
    - **Syntax:** `export class UserService { static async doSomething(db, ...) }`

3. **Repository Layer** (`domains/<name>/<name>Repository.ts`)
    - **Role:** Data Access Object (DAO).
    - **Responsibilities:**
        - Direct access to Drizzle `db` instance.
        - Strictly database queries (select, insert, update).
        - **NO** complex business logic.

4. **Mapper Layer** (`domains/<name>/<name>Mapper.ts`)
    - **Role:** DTO Transformation.
    - **Responsibilities:**
        - Converts DB Rows -> Client DTOs.
        - Hides internal IDs or flags.

### Code Style & Implementation

**1. Repository (`server/src/domains/user/userRepository.ts`)**
```typescript
import { eq } from 'drizzle-orm';
import { db } from '../../db'; // Or inject via args
import { users } from '../../db/schema';

export class UserRepository {
  // Pass transaction/db context for transaction support
  static async getById(tx: typeof db, id: string) {
    return await tx.query.users.findFirst({
      where: eq(users.id, id),
    });
  }

  static async create(tx: typeof db, data: typeof users.$inferInsert) {
    const [result] = await tx.insert(users).values(data).returning();
    return result;
  }
}
```

**2. Service (`server/src/domains/user/userService.ts`)**
```typescript
import { db } from '../../db';
import { UserRepository } from './userRepository';
import { UserMapper } from './userMapper';

export class UserService {
  static async register(name: string, email: string) {
    // Transaction example
    return await db.transaction(async (tx) => {
      const existing = await UserRepository.findByEmail(tx, email);
      if (existing) throw new Error("User exists");

      const user = await UserRepository.create(tx, { name, email });
      return UserMapper.toDTO(user);
    });
  }
}
```

**3. Controller (`server/src/routes/users.ts`)**
```typescript
import { Hono } from 'hono';
import { sValidator } from '@hono/standard-validator';
import * as v from 'shared'; // Import valibot from shared
import { UserService } from '../domains/user/userService';

// Define Validation Schema
const registerSchema = v.object({
  name: v.string(),
  email: v.string([v.email()]),
});

const app = new Hono()
  .post('/register', sValidator('json', registerSchema), async (c) => {
    const data = c.req.valid('json');
    
    // Delegate to Service
    const result = await UserService.register(data.name, data.email);
    
    return c.json(result);
  });

export default app;
```

---

## 4. Frontend Guidelines (`client/src/`)

### Architecture: Feature-Sliced Design (FSD)

Files in `client/src/` MUST use **`kebab-case`**.

- **app/**: Global setup (Providers, Styles).
- **pages/**: Route components.
- **widgets/**: Complex standalone UI blocks.
- **features/**: User actions (e.g., `auth/login-button`).
- **entities/**: Domain logic (Data fetching hooks).
- **shared/**: Reusable UI & libs (Buttons, Formatting).

### Data Fetching & RPC

We use **TanStack Query** wrapping **Hono RPC**.

**1. RPC Client Setup (`client/src/shared/api/client.ts`)**
```typescript
import { hc } from 'hono/client';
import type { AppType } from '../../../../server/src'; // Import Type Only

export const client = hc<AppType>(import.meta.env.VITE_API_URL);
```

**2. Entity Hook (`client/src/entities/user/api/use-user.ts`)**
```typescript
import { useQuery } from '@tanstack/react-query';
import { client } from '@/shared/api/client';

export function useUser() {
  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const res = await client.api.users.me.$get();
      if (!res.ok) throw new Error("Failed to fetch");
      return await res.json();
    },
    // Global defaults handle staleTime/gcTime, overrides here if needed
  });
}
```

### PWA & Cache Configuration

In `client/src/app/providers/query-provider.tsx`:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // "Instant App" feel: Data remains fresh for 5 mins
      staleTime: 5 * 60 * 1000, 
      // Keep in memory/storage for 24h to allow offline view
      gcTime: 24 * 60 * 60 * 1000, 
      retry: 1,
    },
  },
});
```

---

## 5. Shared Workspace (`shared/src/`)

**Purpose:** Manage versions and share DTOs.

`shared/src/index.ts`:
```typescript
// Re-export external libs to ensure Client/Server use exact same version
export * as v from 'valibot'; 
export { format, addDays } from 'date-fns';

// Export Shared Types/Schemas
export * from './schemas/subscription-dto';
```

---

## 6. Database & Schema

- **File:** `server/src/db/schema.ts` (Drizzle)
- **Naming:**
    - Tables/Columns: `snake_case` (DB standard).
    - TypeScript objects: `camelCase` (Drizzle handles mapping).
- **Operations:** Use `db.transaction` for complex Service logic.

---

## 7. Summary of Naming Conventions

| Context            | Case Style   | Example            | Reason                                     |
| :----------------- | :----------- | :----------------- | :----------------------------------------- |
| **Frontend Files** | `kebab-case` | `user-card.tsx`    | Standard React/FSD style                   |
| **Backend Files**  | `camelCase`  | `userService.ts`   | Node/JS Standard                           |
| **DB Tables/Cols** | `snake_case` | `is_active`        | PostgreSQL Standard                        |
| **Classes**        | `PascalCase` | `UserService`      | OOP Standard                               |
| **Methods**        | `camelCase`  | `getById`          | JS Standard                                |
| **Shared Libs**    | -            | `import { v } ...` | Import via `shared` package                |
