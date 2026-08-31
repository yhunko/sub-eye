# Offline Flip Implementation Plan (Plan B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make SubEye run entirely on the device — no API, no database, no accounts — by implementing `@subeye/store`'s ports over MMKV, flipping the mobile data layer onto them, and deleting Clerk, the transport and `apps/server`.

**Architecture:** Plan A left `@subeye/store` as use-cases over five injected ports. This plan supplies a second implementation of those ports backed by a single JSON document in MMKV, points the app's TanStack Query functions at them, and removes everything that existed to talk to a server. No use-case changes. No new external dependencies.

**Tech Stack:** Expo 57 / React Native 0.86, `react-native-mmkv` v4 (Nitro), `expo-crypto`, TanStack Query v5, `bun:test`, Biome, dependency-cruiser, madge.

## Prerequisite

**Plan A must be complete and merged** — all eleven tasks of `docs/superpowers/plans/2026-08-24-package-split.md`, through Task 11's end-to-end verification. This plan assumes eight packages exist, that `apps/server/src/domains` is adapters only, and that `packages/store` exports the use-cases listed in its `src/index.ts`. Do not start B1 before Task 11 is green.

## Global Constraints

- **Runner is `bun:test`.** There is no vitest in this repo.
- **No new external npm dependencies.** Every dependency this plan needs is already installed: `react-native-mmkv` v4, `expo-crypto` (installed and currently unused), `date-fns`, `valibot`.
- **`packages/store` does not change in this plan.** If a use-case needs editing to make the MMKV adapter work, the adapter is wrong — stop and report. The only exception is Task B7, which deletes the server's port implementations, not the use-cases.
- **MMKV v4 is Nitro:** instantiate with `createMMKV()`. `new MMKV()` throws.
- **Purity still holds.** The seven pure packages stay pure. `packages/store` stays impure only through its ports.
- **Day-vs-instant discipline is unchanged and is now unguarded.** `paymentDate`, `willBeCancelledAt`, `resumeAt`, `phase.startsAt`, `phase.endsAt` are calendar days at UTC midnight; `pausedAt`, `appliedAt`, `createdAt`, `updatedAt` are instants. The server never floored `paymentDate` on write either — the client's `toIsoDay` is the only floor, and after this plan it is the only one that exists.
- **Comment discipline** (root CLAUDE.md): comments only for a quirk, a trap, a non-obvious edge case, or a rationale invisible at the call site. Never restate the line below; never write "moved from X".
- **Commits are conventional.** One commit per task.
- **Gates before any task is done:** `bun run type-check`, `bun run test`, `bun run check:boundaries`, `bun run check:circular`. All four green.
- **Never run `expo` from the repo root** — always `bun run --cwd apps/mobile <script>`.

## Context that changes the shape of this plan

**There are no real users.** Production holds the author's own data — roughly 45 subscriptions, 21 categories, 0 price phases across 3 accounts. Losing it is acceptable. That removes the two most expensive things from the original sketch:

- **No seed-from-cache migration.** An earlier draft had the offline build read the existing MMKV Query cache and invert DTOs back into rows. Delete that idea; it exists to protect users who do not exist.
- **No staged server shutdown.** The original plan kept the Worker alive read-only for a release cycle. Unnecessary. `apps/server` is deleted in Task B7 of this same plan, after a `pg_dump`.

**Restoring the author's own subscriptions is a nice-to-have, and Task B5 is optional.** It is included because it turned out to be genuinely clean — an export script plus a `__DEV__`-only paste screen, both disposable. If it looks like more than that when you get there, skip it and retype fifteen subscriptions by hand.

**iCloud sync is NOT in this plan and is NOT paywalled.** iOS device backup already covers "lost phone" for free with zero code; Task B8 verifies MMKV is inside the backup set, which is the whole of the free durability story. `NSUbiquitousKeyValueStore` is a later, separate piece of work, and it stays in the free tier when it lands: gating it buys no cost relief (marginal cost per user is zero, which is the entire argument for one-time pricing) and insurance behind a paywall reads as a threat in a way that a capability does not.

---

## File structure

### New

```
apps/mobile/src/shared/lib/store/
  document.ts        the StoreDoc type, read, write, the two-key swap
  ports.ts           the five ports over the document + now/newId
  fx.ts              rate table: bundled seed, daily refresh, MMKV cache
  fx-seed.json       a pinned USD rate document, checked in
  index.ts
  document.test.ts
  ports.test.ts
  fx.test.ts
```

### Rewritten in place

```
apps/mobile/src/entities/subscription/api/   list, detail, use-create, use-update,
                                             use-delete, use-lifecycle, use-phases
apps/mobile/src/entities/category/api/       categories
apps/mobile/src/entities/dashboard/api/      use-dashboard, use-monthly-summary
apps/mobile/src/entities/user/api/           preferences
apps/mobile/src/app/(tabs)/_layout.tsx       auth gate collapses; reminders + due phases
apps/mobile/src/app/_layout.tsx              provider chain loses Clerk
apps/mobile/src/widgets/settings-page/       account rows become "Erase all data"
```

### Deleted

```
apps/mobile/src/shared/api/                  6 files  — transport
apps/mobile/src/shared/auth/                 4 files  — token bridge, cache, session hint
apps/mobile/src/app/(auth)/                  5 files  — auth routes
apps/mobile/src/widgets/auth-page/          20 files  — auth screens
apps/mobile/src/shared/lib/online.ts                  — nothing to be online for
apps/mobile/src/shared/lib/persisted-cache.ts         — the store is the cache
apps/mobile/src/entities/subscription/model/optimistic-mutation.ts
apps/mobile/src/entities/subscription/model/cache.ts
apps/mobile/src/entities/user/api/use-seed-preferred-currency.ts
apps/mobile/src/entities/user/api/use-seed-preferred-timezone.ts
apps/server/                                81 files  — the whole workspace
```

---

## Task B1: the MMKV store adapter

**Files:**
- Create: `apps/mobile/src/shared/lib/store/{document.ts,ports.ts,index.ts}`
- Create: `apps/mobile/src/shared/lib/store/{document.test.ts,ports.test.ts}`
- Modify: `apps/mobile/package.json`

**Interfaces:**
- Consumes: `@subeye/store` (`Ports`, the four record types), `react-native-mmkv`, `expo-crypto`.
- Produces:
  ```ts
  export type StoreDoc = {
    v: 1;
    preferences: PreferencesRecord;
    categories: CategoryRecord[];
    subscriptions: SubscriptionRecord[];
    phases: PricePhaseRecord[];
  };
  export const readDoc: () => StoreDoc;
  export const writeDoc: (next: StoreDoc) => void;
  export const eraseDoc: () => void;
  export const localPorts: Ports;
  ```

- [ ] **Step 1: Write the failing document test**

Create `apps/mobile/src/shared/lib/store/document.test.ts`:

```ts
import { beforeEach, expect, test } from "bun:test";
import { eraseDoc, readDoc, writeDoc } from "./document";

beforeEach(() => eraseDoc());

// A cold install must read as an empty store with real defaults, never as
// undefined — every screen renders straight off this.
test("a cold read returns defaults, not undefined", () => {
  const doc = readDoc();
  expect(doc.v).toBe(1);
  expect(doc.subscriptions).toEqual([]);
  expect(doc.categories).toEqual([]);
  expect(doc.phases).toEqual([]);
  expect(doc.preferences.preferredCurrency).toBe("uah");
  expect(doc.preferences.preferredTimezone).toBe("UTC");
});

// A blob written by an older build, or a truncated one, must not take the app
// down at module load, where there is no error boundary yet.
test("an unparseable document falls back to defaults", () => {
  writeRaw("{not json");
  expect(readDoc().subscriptions).toEqual([]);
});

// The whole document is rewritten per mutation, so a crash mid-write loses the
// document rather than a row. The two-key swap is what bounds that to "lose the
// last write" instead of "lose everything".
test("a half-written document leaves the previous one readable", () => {
  writeDoc({ ...readDoc(), categories: [{ id: "c1", name: "Media", emoji: "🎬", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }] });
  corruptActiveSlot();
  expect(readDoc().categories).toHaveLength(1);
});
```

`writeRaw` and `corruptActiveSlot` are test-only helpers exported from `document.ts` behind a clearly-named `__testing` object, or defined in the test against the same MMKV instance — your call, but say which in the commit body.

- [ ] **Step 2: Run to verify it fails**

Run: `bun test apps/mobile/src/shared/lib/store/document.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Write `document.ts`**

One JSON document under two alternating MMKV keys plus a pointer, so a crash mid-write cannot destroy the previous good copy:

```ts
import { createMMKV } from "react-native-mmkv";
import type { PreferencesRecord } from "@subeye/store";

const mmkv = createMMKV({ id: "subeye.store" });

// Two slots and a pointer, not one key. The whole document is rewritten on every
// mutation, and MMKV gives no atomicity across that — a kill mid-write would
// otherwise lose the document rather than the last write. Write the idle slot,
// then move the pointer; the pointer move is a single small write.
//
// ponytail: this is the cheapest thing that bounds the failure. If the document
// ever outgrows a whole-document rewrite, the port boundary in ./ports is where
// SQLite goes, and nothing above it changes.
const SLOTS = ["subeye.doc.a", "subeye.doc.b"] as const;
const POINTER = "subeye.doc.active";

export const DEFAULT_PREFERENCES: PreferencesRecord = {
  preferredCurrency: "uah",
  preferredTimezone: "UTC",
  dateFormat: "DD/MM/YYYY",
  locale: "en",
  theme: "system",
};
```

`readDoc` reads the pointer, parses that slot, and on any failure falls back to the other slot before falling back to defaults. `writeDoc` serialises into the idle slot, then flips the pointer. `eraseDoc` clears all three keys.

Validate shape defensively on read — a missing array becomes `[]`, a missing preferences key takes the default. Do not throw.

- [ ] **Step 4: Run to verify it passes**

Run: `bun test apps/mobile/src/shared/lib/store/document.test.ts`

Expected: PASS.

- [ ] **Step 5: Write the failing ports test**

`packages/store/test/inMemoryPorts.ts` already defines the behaviour every port must have. The MMKV ports must match it — including the two cascades that Postgres used to do:

Create `apps/mobile/src/shared/lib/store/ports.test.ts` asserting, against `localPorts`:

- `subscriptions.remove` deletes the subscription **and its phases** (`ON DELETE CASCADE`).
- `categories.remove` deletes the category and **nulls `categoryId`** on every subscription that referenced it (`ON DELETE SET NULL`) — the category-delete confirmation copy counts exactly those rows.
- `subscriptions.byId` returns `null` for an unknown id rather than throwing.
- `phases.applyBoundary` stamps `appliedAt`, closes the preceding phase's `endsAt`, and copies cost/currency onto the subscription — all three, or none.
- `newId()` returns distinct values across calls.
- A write survives a `readDoc()` round trip.

- [ ] **Step 6: Write `ports.ts`**

Implement `Ports` over `readDoc`/`writeDoc`. Every mutation is read-modify-write of the whole document.

```ts
import * as Crypto from "expo-crypto";
```

`newId: () => Crypto.randomUUID()` — `expo-crypto` is already an installed dependency and is currently unused in `src/`. `now: () => new Date()`.

There is no `userId` anywhere. There are no ownership checks. That is the point.

- [ ] **Step 7: Run both suites**

```bash
bun test apps/mobile/src/shared/lib/store
```

Expected: PASS.

- [ ] **Step 8: Add the workspace dependency and run the gates**

Add `"@subeye/store": "workspace:*"` to `apps/mobile/package.json`, then:

```bash
bun install
bun run type-check && bun run test && bun run check:boundaries && bun run check:circular
```

Expected: all green. Nothing consumes `localPorts` yet — this is dead code in the bundle, deliberately.

- [ ] **Step 9: Commit**

```bash
git add apps/mobile packages bun.lock
git commit -m "feat(mobile): add an MMKV-backed implementation of the store ports"
```

---

## Task B2: FX rates on the device

The one thing that still needs a network — and it needs *a* network, not *yours*.

**Files:**
- Create: `apps/mobile/src/shared/lib/store/fx.ts`, `fx-seed.json`, `fx.test.ts`
- Modify: `apps/mobile/src/shared/lib/store/{ports.ts,index.ts}`

**Interfaces:**
- Consumes: `@subeye/money` (`deriveRatesFor`, `fxDocumentUrl`, `fxVersionCandidates`, `readFxDocument`, `STORED_BASE`).
- Produces: `export const ratesPort: RatesPort;` and `export const refreshRates: (now: Date) => Promise<boolean>;`

- [ ] **Step 1: Generate the seed**

```bash
curl -s "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json" \
  > apps/mobile/src/shared/lib/store/fx-seed.json
```

Check it in. A fresh install in airplane mode must still convert; rates that are weeks stale beat no conversion at all, and `CurrencyUtils.convert` degrades to 1:1 on a missing key rather than throwing.

Note the file is ~10 KB of 341 currency codes and lives under its own MMKV key once cached, never inside the store document — a subscription write must not re-serialise the rate table.

- [ ] **Step 2: Write the failing test**

Create `fx.test.ts`. The pure half is already tested in `packages/money`; what is new here is the caching and fallback policy:

- With nothing cached, `ratesPort.forBase("uah")` returns rates derived from the bundled seed, not `{}`.
- After a successful `refreshRates`, `forBase` returns the fetched rates.
- A `refreshRates` that throws (offline) leaves the previous cache intact and returns `false`.
- `refreshRates` is a no-op returning `true` when the cache's `rateDate` is already today's UTC day — the CDN build is immutable per day, so a second fetch cannot change the answer.

Stub `fetch` with `mock.module` or by injecting it; do not hit the network in a test.

- [ ] **Step 3: Run to verify it fails, then write `fx.ts`**

`refreshRates` walks `fxVersionCandidates(now)` — today, yesterday, then `latest` — because the publisher's immutable build can lag the UTC date. On the first candidate that parses via `readFxDocument`, cache `{ base, rates, rateDate, fetchedAt }` under its MMKV key and return `true`.

`ratesPort.forBase(code)` reads the cache, falls back to the bundled seed, and returns `deriveRatesFor(code, rates)`. It **never** fetches — the request path must not wait on a CDN, which is the same rule the server's `getRates` followed.

Wire `ratesPort` into `localPorts`.

- [ ] **Step 4: Gates and commit**

```bash
bun install
bun run type-check && bun run test && bun run check:boundaries && bun run check:circular
git add apps/mobile
git commit -m "feat(mobile): read FX rates from a bundled seed and refresh them on device"
```

---

## Task B3: flip the data layer

The app stops calling the API. Clerk is still mounted; it is simply no longer used for data.

**Files:**
- Modify: 11 files under `apps/mobile/src/entities/*/api/`
- Delete: `apps/mobile/src/entities/user/api/use-seed-preferred-{currency,timezone}.ts`
- Modify: `apps/mobile/src/app/(tabs)/_layout.tsx`
- Modify: `apps/mobile/src/shared/lib/query.ts`

**Interfaces:**
- Consumes: `@subeye/store` use-cases, `localPorts` from Task B1.
- Produces: unchanged hook names and query keys. **No screen imports change.**

- [ ] **Step 1: Rewrite the query functions**

Each file keeps its hook name, its query key and its return type. Only the function body changes.

| File | Was | Becomes |
|---|---|---|
| `subscription/api/list.ts` | paginated GET, followed to exhaustion | `listSubscriptions(localPorts)` |
| `subscription/api/detail.ts` | GET `/:id` (which also wrote) | `getSubscription(localPorts, id)` |
| `subscription/api/use-create-subscription.ts` | POST | `addSubscription(localPorts, input)` |
| `subscription/api/use-update-subscription.ts` | PATCH | `updateSubscription(localPorts, id, input)` |
| `subscription/api/use-delete-subscription.ts` | DELETE | `deleteSubscription(localPorts, id)` |
| `subscription/api/use-lifecycle.ts` | 4 POSTs | `cancelSubscription` / `renewSubscription` / `pauseSubscription` / `resumeSubscription` |
| `subscription/api/use-phases.ts` | 3 routes | `startPhase` / `cancelPhase` / `applyPhaseNow` |
| `category/api/categories.ts` | 4 routes | `listCategories` / `createCategory` / `updateCategory` / `deleteCategory` |
| `dashboard/api/use-dashboard.ts` | GET | `buildDashboard(localPorts)` |
| `dashboard/api/use-monthly-summary.ts` | GET | `buildMonthlySummary(localPorts)` |
| `user/api/preferences.ts` | GET + PATCH | `readPreferences` / `writePreferences` |

The use-cases are async, so the query functions stay async and TanStack keeps working unchanged.

- [ ] **Step 2: Strip the network-shaped machinery**

In `shared/lib/query.ts`: delete the persister, `persistQueryClientSubscribe`, the `buster`, `MAX_AGE`, the synchronous `readPersistedCache` hydration, and `clearQueryCache`'s MMKV half. The store **is** the cache now; Query becomes an in-memory view over it, and a cold start reads MMKV synchronously through `readDoc` anyway.

Set `staleTime: 0` and drop `retry` — there is nothing to retry and nothing to go stale against. Keep the `QueryCache`/`MutationCache` `onError` Sentry reporting; a throw from a use-case is exactly the kind of bug it was written to catch.

Delete `shared/lib/persisted-cache.ts` and its test, and `shared/lib/online.ts` plus its `import "@/shared/lib/online"` side-effect line in `app/_layout.tsx`.

Delete `entities/subscription/model/optimistic-mutation.ts` and `model/cache.ts` with their tests. A synchronous local write has no latency window to be optimistic in — mutate, then `invalidateQueries`.

- [ ] **Step 3: Give `applyDuePhases` a trigger**

There is no scheduler and never was: a phase boundary fires when the subscription is read. `getSubscription` still calls `applyDuePhases`, so the detail screen keeps working — but the list screen never did, and a user who does not open a subscription never settles its boundary.

Add it to the `AppState → "active"` effect in `app/(tabs)/_layout.tsx` that already rebuilds reminders: on foreground, settle every due phase, then invalidate. This is strictly better coverage than the server had.

- [ ] **Step 4: Delete the preference seed hooks**

`use-seed-preferred-currency.ts` and `use-seed-preferred-timezone.ts` exist to push the device's locale and zone up to the account on first run, keyed by `currency.seeded.${userId}`. With no account, seed the defaults once inside `readDoc`'s cold path instead: if the document is new, set `preferredTimezone` from `Intl.DateTimeFormat().resolvedOptions().timeZone` and `locale` from the device.

**This is where the device-zone-versus-account-zone disagreement finally resolves.** Seed it once, then treat the stored value as authoritative everywhere.

- [ ] **Step 5: Fix the two screens that read offline as broken**

Both are now unreachable failure modes, and their dead branches should go:

- `widgets/subscriptions-page/ui/subscriptions-page.tsx` rendered `m.subs_empty()` ("no subscriptions yet") when a query was paused — an empty account, for a user who had one.
- `widgets/subscription-detail/ui/subscription-detail-page.tsx` span forever on `isPending` from a deep link with a cold cache.
- `widgets/home-page/ui/home-page.tsx` has an `offline = fetchStatus === "paused"` branch and a Retry button. Delete it; `onlineManager` no longer has a source.

- [ ] **Step 6: Run the mobile suite and the gates**

```bash
bun test apps/mobile/src
bun install
bun run type-check && bun run test && bun run check:boundaries && bun run check:circular
```

Tests naming the transport (`shared/api/client.test.ts`, `auth-fetch.test.ts`) still exist and still pass — B4 deletes them. `entities/subscription/api/{list,detail}.test.ts` lose their pagination and cursor cases; keep whatever asserts key shape.

- [ ] **Step 7: Run it on a device**

```bash
bun run --cwd apps/mobile ios
```

Turn on airplane mode first. Every screen must work: add, edit, pause, resume, cancel both ways, renew, start a trial, apply it now, delete, categories, filters, the dashboard. This is the first moment the app is genuinely offline — spend real time here.

- [ ] **Step 8: Commit**

```bash
git add apps/mobile
git commit -m "feat(mobile): read and write subscriptions from the local store"
```

---

## Task B4: delete Clerk and the transport

**Files:**
- Delete: `shared/api/` (6), `shared/auth/` (4), `app/(auth)/` (5), `widgets/auth-page/` (20)
- Modify: `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `widgets/settings-page/ui/settings-page.tsx`, `entities/pro/model/purchases.ts`, `entities/pro/index.ts`, `shared/config/env.ts`, `test-preload.ts`, `app.json`, `package.json`

- [ ] **Step 1: Collapse the auth gate**

`app/(tabs)/_layout.tsx` currently reads `useAuth()` and redirects to `/sign-in` the instant Clerk resolves signed-out. The whole block becomes `return <Tabs />`. `sessionHint` has nothing left to gate and goes with `shared/auth/`.

- [ ] **Step 2: Strip the provider chain**

`app/_layout.tsx` loses `ClerkProvider`, `TokenBridge` and `ProIdentityBridge`. The chain becomes `GestureHandlerRootView → SafeAreaProvider → QueryClientProvider → Stack`.

The splash-hold, the 5-second dead-man's-switch timeout, `unstable_settings.anchor`, the `ErrorBoundary` export and `Sentry.wrap` on the default export all stay — none of them were about auth.

- [ ] **Step 3: Cut RevenueCat's Clerk alias**

In `entities/pro/model/purchases.ts` delete `useProIdentity` and its `useAuth` import — about 35 lines out, none in. `Purchases.configure({ appUserID: null })` at module load already works anonymously, and a non-consumable restores through the Apple Account, which is how it already worked. The only loss is a findable id in the RevenueCat dashboard.

**Everything else in that file stays byte-for-byte**, including `resolvePro`'s fail-open behaviour and the `reportError` on a bad configure key. Drop `useProIdentity` from `entities/pro/index.ts`.

- [ ] **Step 4: Rework Settings**

The account row, `signOut` and `user.delete()` go. `endSession`'s ordering (`cancelReminders` → `clearWidget` → … ) is load-bearing and becomes the body of a single **"Erase all data"** row: confirm destructively, then `cancelReminders()`, `clearWidget()`, `eraseDoc()`, `queryClient.clear()`.

**Keep "Restore purchases."** Guideline 3.1.1 requires a discoverable restore control and a reviewer who cannot find it rejects the build. While there, align its error handling with the paywall's three-way branch — the paywall distinguishes a thrown error ("could not reach the store") from an empty result ("nothing found"), Settings collapses both, and telling a paying customer their purchase does not exist because the network blipped is how a transient outage becomes a refund request.

`widgets/auth-page/model/consent.ts` wrote `termsAcceptedAt` into Clerk's `unsafeMetadata`. With no account there is nowhere to record it and no sign-up to record it at. It goes with the directory.

- [ ] **Step 5: Purge the env vars and the native surface**

- `shared/config/env.ts`: delete `API_URL` and `CLERK_PUBLISHABLE_KEY`. `REVENUECAT_IOS_KEY` stays required; `SENTRY_DSN` and `BRANDFETCH_CLIENT_ID` stay optional.
- `apps/mobile/test-preload.ts`: **delete their floors too.** A stale floor is why a missing env var breaks the suite rather than the boot.
- `apps/mobile/.env` and `.env.example`: remove both keys.
- `app.json`: remove `usesAppleSignIn`, the `expo-apple-authentication` plugin, and the `expo-secure-store` and `expo-web-browser` plugins if present. Guideline 4.8 required Sign in with Apple only *because* Google/GitHub SSO existed; with no accounts the obligation disappears, along with 5.1.1(v) account deletion and the unresolved `/auth/revoke` token-revocation problem.
- `package.json`: remove `@clerk/clerk-expo`, `@subeye/server`, `hono`, `expo-secure-store`, `expo-apple-authentication`, `expo-web-browser`, `@tanstack/query-async-storage-persister`, `@tanstack/react-query-persist-client`, `@react-native-community/netinfo`.

- [ ] **Step 6: Prebuild and rebuild**

```bash
bun run --cwd apps/mobile prebuild
```

Native modules were removed, so a JS reload is not enough.

⚠️ If `pod install` dies on an ASCII-8BIT encoding error, rerun with `LANG=en_US.UTF-8`.

- [ ] **Step 7: Gates, device check, commit**

```bash
bun install
bun run type-check && bun run test && bun run check:boundaries && bun run check:circular
bun run --cwd apps/mobile ios
```

The app must open straight into the tab tree with no sign-in, survive a cold start, and still show Pro state if you were entitled. Test "Erase all data" and confirm reminders and the widget clear with it.

```bash
git add apps/mobile bun.lock
git commit -m "feat(mobile): remove Clerk, the auth screens and the API transport"
```

---

## Task B5: restore the author's own data

**Reduced from the original sketch after assessment.** The earlier version added a `__DEV__`-gated paste screen inside Settings. That is app code that has to be written, tested, and then deleted again — three touches and an import path in the binary, however well gated — for a job that happens exactly once.

**Why do it at all, given retyping is an option.** Hand-entry loses `paymentDate`. That column is the anchor every future occurrence is projected from, so a day that is subtly wrong produces a subscription that renews on the wrong date forever and reminds on the wrong morning. It also loses `createdAt`, `notes`, `brandDomain` and the category assignments. Fifteen rows is twenty minutes of typing and an unknown number of quiet errors.

**Why this version is clean.** One committed script, which lives in `apps/server/scripts/` and is deleted along with the whole workspace two tasks later, plus a temporary edit that is never committed. There is nothing to clean up afterwards because nothing lasting was added.

**Files:**
- Create: `apps/server/scripts/export-store-doc.ts` (deleted by Task B7)

- [ ] **Step 1: Write the export script**

Follow the existing `apps/server/scripts/db-sql.ts` pattern. Take a Clerk user id, read the four tables, print a `StoreDoc` to stdout.

The inversion is where the care goes:

- **Drop every `userId`.** `StoreDoc` is single-tenant.
- **Normalise the two timestamp modes.** `apps/server/src/db/schema.ts` is inconsistent: `paymentDate`, `pausedAt`, `resumeAt` and the three phase timestamps are `mode: "string"` and arrive as strings; `willBeCancelledAt` (SQL column `cancelled_at`), `createdAt` and `updatedAt` are Date mode and arrive as `Date`. `StoreDoc` is ISO strings throughout — convert, and remember `cancelled_at` is naive while the others carry a zone.
- **Keep ids verbatim.** They are already UUID strings and port unchanged.
- **`cost` stays a string.** It is `numeric(10,2)`, Drizzle hands it back as a string, and the app reads it with `Number(...)`. Do not parse it here.
- **Emit `preferences` from the `users` row**, mapping the `timezone` column to `preferredTimezone`, and `v: 1`.

```bash
bun --env-file=apps/server/.env apps/server/scripts/export-store-doc.ts user_2… > /tmp/subeye-restore.json
```

Sanity-check the output by eye before going near the device: the subscription count, a couple of `paymentDate` values, and that no `userId` survived.

- [ ] **Step 2: Load it once, with a temporary edit that is never committed**

Copy the JSON to `apps/mobile/src/shared/lib/store/restore.json`, then add three lines to `apps/mobile/src/shared/lib/store/index.ts`:

```ts
// TEMPORARY — never commit. Seeds the store once from a prod export.
import { readDoc, type StoreDoc, writeDoc } from "./document";
import restore from "./restore.json";
if (__DEV__ && readDoc().subscriptions.length === 0) writeDoc(restore as StoreDoc);
```

Import from `./document`, not from the barrel's own re-exports — `export { readDoc } from "./document"` forwards the name without binding it locally, so referencing it in `index.ts` would not compile.

Run a dev build once. Metro imports JSON natively, so no config change is needed.

- [ ] **Step 3: Verify against production, then revert**

In the app, confirm the subscription count, the dashboard totals, the category breakdown and the scheduled reminder count all match what production showed. Then:

```bash
git checkout apps/mobile/src/shared/lib/store/index.ts
rm apps/mobile/src/shared/lib/store/restore.json
git status --short   # must show only the new script
```

- [ ] **Step 4: Commit the script alone**

```bash
git add apps/server/scripts/export-store-doc.ts
git commit -m "feat(server): export a user's data as a local store document"
```

`git status` must be clean afterwards. If `restore.json` or the edit to `index.ts` appears in the diff, the task is not done.

---

## Task B6: copy and legal

A submission blocker, and independent of everything above — do it in parallel if you like.

**Files:**
- Modify: `apps/landing/src/i18n/{en,uk}.ts`
- Modify: `apps/landing/src/pages/{en,uk}/{privacy-policy,terms-of-service,support}.astro`

- [ ] **Step 1: Fix the claims the binary now contradicts**

All four legal URLs are pinned by `apps/landing/test/routes.test.ts` **and** by the shipped binary via `shared/config/legal-url.ts`. The URLs stay; only the content changes.

- FAQ item 3 says *"Do I need an account? **Yes.** Your subscriptions live on the server so they survive a lost phone."* → No, and explain what does protect them (device backup).
- Terms, "Your account" section: *"You need an account so your subscriptions survive a lost phone."* → delete the section.
- Privacy policy: delete the Clerk, Neon, Cloudflare-API and PostHog rows and all "account identifier" language. Rewrite the deletion paragraph around "Erase all data" and the legal-basis paragraph.
- **Add jsDelivr.** The device now fetches FX rates itself, which discloses an IP to a third party — the same category as the existing Brandfetch and Google-favicon disclosures. Leaving it out makes the policy wrong in the other direction.
- Free-tier list and `meta.description`: no accounts, works offline.

Both locales. The processor list drops from eight to four (Sentry, RevenueCat, Brandfetch, Google), and "SubEye never touches your bank" gains "or the network".

- [ ] **Step 2: Note the App Store privacy label change**

Email, Name and User ID all drop. What remains is Crash Data, Purchases and Search History. Record it in `docs/release/MANUAL-CHECKLIST.md` beside the existing table rather than editing App Store Connect from here.

- [ ] **Step 3: Gates and commit**

```bash
bun run --cwd apps/landing type-check && bun run --cwd apps/landing test
git add apps/landing docs
git commit -m "docs(landing): describe SubEye as accountless and offline"
```

---

## Task B7: delete the server

Irreversible. `pg_dump` first, and do not start before B5 is either done or explicitly skipped.

- [ ] **Step 1: Back up, then delete**

```bash
pg_dump "$DATABASE_URL" > ~/subeye-final.sql
git rm -r apps/server
```

- [ ] **Step 2: Purge every reference**

- `package.json`: delete `check:circular:server`, `deploy:dev`, `dev:server`, `dev:lan`, and rewrite `dev:mobile` (it currently builds server types first). **The whole `check:circular` chain fails if `check:circular:server` is left pointing at a deleted directory.**
- `dependency-cruiser.cjs`: delete `mobile-server-only-via-client`, `server-repository-is-leaf`, and the server clause of `no-package-to-app`. Update the header comment's invariant count.
- `.github/workflows/`: delete `deploy-dev.yml` and the deploy half of `release-production.yml`. Keep the quality gate and semantic-release.
- Root `CLAUDE.md` and `README.md`: rewrite the architecture block. Three apps become two.
- `turbo.json` needs no change — its input globs are generic.

- [ ] **Step 3: Gates from a clean install**

```bash
rm -rf node_modules .turbo
bun install
bun run type-check && bun run test && bun run lint && bun run check:boundaries && bun run check:circular
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat!: remove the API server, database and accounts"
```

Infrastructure teardown is **Task B9**, gated on B8's device pass. Do not do it here — but do not defer it to TestFlight either. See B9.

---

## Task B8: verify

- [ ] **Step 1: Full gates, three host timezones**

```bash
bun run type-check && bun run test && bun run lint && bun run check:boundaries && bun run check:circular
TZ=America/Los_Angeles bun run test
TZ=Pacific/Auckland bun run test
```

- [ ] **Step 2: Confirm MMKV is inside the device backup set**

This is the entire free durability story, so verify it rather than assuming. MMKV writes under the app's Library directory; confirm the store files are not excluded from backup (no `NSURLIsExcludedFromBackupKey`, not under `Library/Caches`). Then prove it end to end: create subscriptions, back the device up, delete and reinstall the app, restore, and confirm the data returns.

If MMKV turns out to live somewhere backup-excluded, that is the trigger for the iCloud key-value work — not a reason to ship without durability.

- [ ] **Step 3: Airplane-mode device pass**

Cold start with no network. Every lifecycle action, the dashboard, categories, filters, the widget, the paywall, restore purchases. Then Settings → Notifications: a non-zero scheduled count, a sensible next fire time, and a test notification that arrives.

- [ ] **Step 4: Confirm nothing reaches the network**

Run the app with a proxy or Charles, or simply grep: `grep -rn "fetch(\|https://" apps/mobile/src --include=*.ts --include=*.tsx | grep -v test`. The only survivors should be the FX CDN, Brandfetch search, the Google favicon fallback, Sentry and RevenueCat. Anything else is a leftover.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "chore: verify the offline build end to end"
```

---

## Task B9: tear down the infrastructure

Irreversible in a way nothing else in this plan is. Git can undo a deletion; it cannot undo a revoked Clerk key or a deleted Neon project.

**Gated on Task B8 passing on a real device — not on TestFlight.** An earlier draft of this plan said to wait for a TestFlight build. That was reflexive caution imported from a playbook written for apps with users. This app has none: TestFlight here is one person on one iPhone, which is exactly what B8 already exercises. Waiting buys rollback insurance for a rollback nobody would perform — the mobile app has already deleted Clerk and the transport, so "rolling back" would mean reverting commits *and* redeploying a Worker.

Worse, leaving the server running while the app ignores it is a confusing state. It invites checking the server during testing, which can mask a local bug.

**The real insurance is the dump, not the running service.** A `pg_dump` is a complete, replayable copy that costs nothing to keep forever.

- [ ] **Step 1: Verify the dump before trusting it**

Task B7 took `~/subeye-final.sql`. A dump you have not read is not a backup.

```bash
ls -lh ~/subeye-final.sql
grep -c "INSERT INTO" ~/subeye-final.sql
grep -o "COPY public\.[a-z_]*" ~/subeye-final.sql | sort -u
```

Expect all five tables and a row count consistent with the census — roughly 45 subscriptions, 21 categories, 0 price phases, 3 users. A dump with zero inserts means the connection string pointed somewhere empty. Store it outside the repo, somewhere backed up.

- [ ] **Step 2: Confirm the device is the source of truth**

The data must already be on the phone and correct. Re-check the numbers B5 verified — subscription count, dashboard totals, category breakdown — and confirm the app has survived at least one cold start since. If B5 was skipped and you retyped by hand, confirm the payment anchors instead: those are what every future occurrence and every reminder are projected from.

- [ ] **Step 3: Revoke credentials, then delete projects**

Revoke first. A deleted project can leave a valid key behind; a revoked key is dead regardless of what happens to the project.

| Service | Action |
|---|---|
| Clerk | Revoke `CLERK_SECRET_KEY` and the webhook signing secret, then delete the production instance |
| Neon | Delete the project; then revoke `NEON_API_KEY` (root `.env`) |
| Cloudflare | Delete the **API** Worker only. **Keep the account and the landing Worker** — `apps/landing` still deploys there |
| PostHog | Delete the project. Server-side only; mobile never had it |
| Sentry | **Keep.** Mobile still reports to it |
| RevenueCat | **Keep.** Obviously |
| GitHub | Delete the repository secrets B7 listed as unused |

- [ ] **Step 4: Delete the local secrets**

```bash
rm apps/server/.env      # already gone with the workspace, confirm
rm .env                  # only if NEON_API_KEY is unused elsewhere — check first
```

Neither was ever tracked by git (`git ls-files | grep .env` returns only `apps/mobile/.env.example`), so nothing leaked into history. Deleting them is hygiene, not remediation — the revocation in Step 3 is what actually matters.

- [ ] **Step 5: Record the new cost floor**

Update `docs/release/MANUAL-CHECKLIST.md`'s cost table. Roughly $68/month becomes the landing Worker plus $99/year for the Apple Developer Program and the domain. That drop is the thing that makes a one-time purchase price sustainable, so it is worth writing down rather than remembering.

```bash
git add docs
git commit -m "docs(release): record the post-teardown cost floor"
```

---

## Self-review notes

**Scope coverage.** Ports (B1), FX (B2), the data flip (B3), auth removal (B4), optional restore (B5), copy (B6), server deletion (B7), verification (B8).

**Deliberately out of scope.** Repeating notification triggers are Plan C — they change `planReminders`' output and would confound B3's diff. iCloud key-value sync is a later piece; B8 verifies device backup, which is the free half and covers the stated need. A JSON export in Settings is not built: the docs forbid CSV export three times, a JSON backup is a different thing, but nothing needs it while B5 exists and there are no users.

**What this plan deletes.** About 9,400 lines across 116 files, against roughly 400 added. Net removal of four to seven npm dependencies and zero additions.
