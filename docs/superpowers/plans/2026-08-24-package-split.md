# Concern-Scoped Package Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every domain rule out of `apps/server` and `apps/mobile` into eight concern-scoped packages, so the server becomes a transport shell and the mobile app becomes a thin UI layer — with the server still live and no user-visible change.

**Architecture:** Eight packages, one concern each, acyclic. `time` and `model` are the leaves; `money` derives from `model` for the period vocabulary. `lifecycle`, `pricing`, `spend`, `reminders` are pure derivations over them. `store` is the only package that touches IO, and it does so through an injected `StoragePort` — the server supplies a Drizzle adapter today, the mobile app supplies an MMKV adapter in the follow-on plan. Mutation rules become pure `(record, args, now) → Partial<record>` functions, so the service tests lose their hand-rolled fakes entirely.

**Tech Stack:** Bun 1.3 workspaces, Turbo, TypeScript (source-only packages, `noEmit`), `bun:test`, Biome, dependency-cruiser, madge, valibot, date-fns.

## Global Constraints

- **Runner is `bun:test`.** There is no vitest anywhere in this repo. Import from `bun:test`.
- **Packages export source.** Every `@subeye/*` package points `exports` at `./src/index.ts`, sets `"type": "module"`, `"private": true`, `"version": "0.0.1"`, and type-checks with `noEmit`. No build step, no `dist`.
- **Packages are pure.** `time`, `money`, `model`, `lifecycle`, `pricing`, `spend`, `reminders` must never import `db`, call `fetch`, or read a clock. They take `now: Date` as a parameter. A pure function reports a caller error by returning `null`; the caller converts that into a domain error.
- **`packages/store` is the sole exception** and is impure only through its injected `StoragePort`. It must not import a concrete database driver.
- **No new external npm dependencies.** Everything here is a move or a workspace edge.
- **Never run `expo` from the repo root.** Always `bun run --cwd apps/mobile <script>`.
- **Comment discipline:** comments only for a quirk, a trap, a non-obvious edge case, or a decision whose rationale is invisible at the call site. Never restate the line below. Never write "moved from X" — that is the commit message's job.
- **Money rule:** a change to phase logic, occurrence projection, or currency conversion needs a test that fails without it.
- **Commits are conventional** — commitlint gates them.
- **Gates before any task is done:** `bun run type-check`, `bun run test`, `bun run check:boundaries`, `bun run check:circular`. All four green.
- **Adding a workspace means adding it to `turbo.json` inputs is NOT required** — the existing globs (`src/**/*.ts`, `test/**/*.ts`, `tsconfig.json`, `package.json`) already cover a new package. Do not edit `turbo.json` in this plan.
- **Day-vs-instant discipline** carries into every package: `paymentDate`, `willBeCancelledAt`, `resumeAt`, `phase.startsAt`, `phase.endsAt` are calendar days stored as UTC midnight. `pausedAt`, `appliedAt`, `createdAt`, `updatedAt` are instants. Never compare across the two.

---

## Scope note

This plan is one of three. It is independently shippable and independently valuable — the server keeps running and behaves identically throughout.

| Plan | Covers | Depends on |
|---|---|---|
| **A — this one** | The eight-package split | — |
| B — offline flip | MMKV `StoragePort` adapter, seed migration, delete transport/auth, delete `apps/server` | A |
| C — reminder runway | Repeating OS triggers so reminders survive months without the app opening | A |

Do not start B or C until A is merged and green.

---

## File structure

### New packages

```
packages/time/           UTC calendar days, recurrence, the day-vs-instant rules
  src/calendarDay.ts       DateTimezoneUtils
  src/recurrence.ts        RecurrenceUtils
  src/index.ts
  test/calendarDay.test.ts
  test/recurrence.test.ts
  CLAUDE.md

packages/money/          currency codes, rate tables, conversion, FX document parsing
  src/rateTable.ts         RateTable type
  src/currency.ts          CurrencyUtils
  src/fxDocument.ts        deriveRatesFor + the CDN document shape
  src/index.ts
  test/crossRates.test.ts
  CLAUDE.md

packages/model/          records, DTOs, valibot schemas, the two status vocabularies
  src/…                    (moved wholesale from packages/shared, minus the four utils)
  CLAUDE.md

packages/lifecycle/      status derivation, allowed actions, pure transitions
  src/status.ts            deriveSubscriptionStatus, getAllowedActions
  src/lifecycleStatus.ts   getSubscriptionLifecycleStatus, shouldIncludeOccurrence,
                           isCurrentlyActiveSubscription
  src/transitions.ts       cancel/renew/pause/resume as pure functions
  src/index.ts
  test/status.test.ts
  test/allowedActions.test.ts
  test/transitions.test.ts
  CLAUDE.md

packages/reminders/      what to remind about and when — no expo, no OS types
  src/reminder.ts          Reminder, ReminderKind, ReminderTarget, ReminderInput
  src/planReminders.ts     planReminders
  src/settings.ts          ReminderSettings + the Pro gate
  src/index.ts
  test/planReminders.test.ts
  test/settings.test.ts
  CLAUDE.md

packages/store/          storage ports + use-cases. The only impure package.
  src/records.ts           SubscriptionRecord, CategoryRecord, PricePhaseRecord, PreferencesRecord
  src/ports.ts             SubscriptionPort, CategoryPort, PricePhasePort, PreferencesPort, RatesPort
  src/subscriptionUseCases.ts
  src/phaseUseCases.ts
  src/categoryUseCases.ts
  src/preferencesUseCases.ts
  src/analytics.ts         dashboard + monthly-summary composition
  src/index.ts
  test/…                   (the 14 ported server service tests, driven by an in-memory port)
  CLAUDE.md
```

### Modified

```
packages/pricing/        deps repointed; the pricing → spend edge is deleted
packages/spend/          deps repointed
packages/currency/       DELETED (absorbed by money)
packages/shared/         RENAMED to model; the four utils leave
apps/server/             services become thin adapters over @subeye/store
apps/mobile/             plan.ts loses its private recurrence engine
dependency-cruiser.cjs   package-layer rules added
```

### Dependency graph (must stay acyclic — `bun run check:circular` enforces)

```
time        model
  │        ╱  │
  │       ╱   │
  │    money  │
  └──┬────┴───┴──┬──────────┐
     │           │          │
 lifecycle    pricing   reminders
     │           │
     └── spend ──┘
           │
         store
```

The edges that actually exist, verified against
`depcruise --output-type dot packages` on 2026-08-24 with
`tsPreCompilationDeps: true` (without it every `import type` edge is invisible):

| Package | Imports |
|---|---|
| `time` | — |
| `model` | — |
| `money` | `model` |
| `lifecycle` | `model` `time` |
| `pricing` | `model` `money` `time` |
| `spend` | `lifecycle` `model` `money` `time` |
| `reminders` | `model` `time` |
| `store` | `lifecycle` `model` `money` `pricing` `spend` `time` |

Two corrections to the table this plan shipped with. `money` is **not** a leaf —
`currency.ts` and `billingDetails.ts` need `SubscriptionPeriod` and the billing
types, and `model` imports nothing, so the edge is correct and the table was
wrong. And `store` composes **six** packages, not seven: nothing in it plans a
reminder, because reminder scheduling is a client concern. `reminders` likewise
needs only `model` and `time`, not the five the table allowed.

What is *enforced* is looser than this table, deliberately: the rules forbid
wrong-direction edges rather than enumerate right-direction ones.

---

## Task 0: Hermes ICU probe

Gates the entire `time` package design. Ship nothing; find out whether `TZDate` works on device before building on it.

**Why:** `DateTimezoneUtils.toZoned` uses `TZDate` from `@date-fns/tz`, which resolves zones via `new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })` and then `.split("GMT")[1]`. If Hermes does not support `longOffset`, the library's `try` swallows the failure, falls through to a regex against an IANA name like `"Europe/Kyiv"`, and **returns `NaN`** — every derived date becomes Invalid Date, silently. This path has never executed on device: mobile imports `@subeye/shared` in 54 files but only for types, `isCurrentlyActiveSubscription` and the emoji lists.

**Files:**
- Modify (temporarily): `apps/mobile/src/app/_layout.tsx`

**Interfaces:**
- Produces: a yes/no that decides whether `packages/time` keeps its `timezone?: string` parameter.

- [ ] **Step 1: Add the temporary probe**

In `apps/mobile/src/app/_layout.tsx`, directly above `function RootLayout()`, add:

```tsx
// TEMPORARY — Task 0 probe. Delete before committing anything else.
{
  const longOffset = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Kyiv",
    timeZoneName: "longOffset",
  }).format(new Date());
  console.log("[probe] longOffset =", longOffset);
  console.log("[probe] hasGMT =", longOffset.includes("GMT"));
}
```

- [ ] **Step 2: Run on a real iOS device**

Run: `bun run --cwd apps/mobile ios`

Expected: the Metro console prints a line containing `GMT+`, e.g. `[probe] longOffset = 8/24/2026, GMT+3` and `[probe] hasGMT = true`.

- [ ] **Step 3: Run on a real Android device**

Run: `bun run --cwd apps/mobile android`

Expected: same two lines, `hasGMT = true`.

- [x] **Step 4: Record the outcome and revert the probe**

**RESULT, 2026-08-24 — PASS.** `[probe] longOffset = 8/24/2026, GMT+03:00`, `[probe] hasGMT = true`.

Hermes resolves IANA zones through `Intl.DateTimeFormat` with `timeZoneName: "longOffset"`. The fallback in Step 5 does **not** apply: `packages/time` keeps its `timezone?: string` parameters and keeps `@date-fns/tz` as a dependency.

Copy this verbatim into `packages/time/CLAUDE.md` when Task 1 creates it:

```markdown
## Hermes

`Intl.DateTimeFormat(…, { timeZoneName: "longOffset" })` verified working on
device 2026-08-24 — returned `GMT+03:00` for `Europe/Kyiv`. This is what makes
`TZDate` from `@date-fns/tz` safe here. If it ever regresses, the library
swallows the failure and `tzOffset` returns `NaN`, so every derived date becomes
Invalid Date with nothing thrown. Re-probe before trusting a new RN or Hermes
version.
```

**Android is not yet confirmed** — one platform was probed. It does not block Tasks 1–3, but confirm it before Plan B: a `false` on Android removes the `timezone` parameter from this package's public API, which is a rewrite of Task 1 rather than a patch.

Then revert:

```bash
git checkout apps/mobile/src/app/_layout.tsx
```

- [ ] **Step 5: If either platform printed `hasGMT = false`, take the fallback**

Do not proceed with a `timezone` parameter. In Task 1, drop it: `currentCalendarDay(now)` floors to the device's own calendar day, which is what `apps/mobile/src/shared/lib/format/day.ts` already does and already tests east and west of UTC. Offline there is no second opinion to reconcile — the account zone *is* the device zone. Record the decision in `packages/time/CLAUDE.md` and delete `@date-fns/tz` from the new package's dependencies.

No commit for this task — it produces a decision, not a diff.

---

## Task 1: `packages/time`

**Files:**
- Create: `packages/time/package.json`
- Create: `packages/time/tsconfig.json`
- Create: `packages/time/src/calendarDay.ts`
- Create: `packages/time/src/recurrence.ts`
- Create: `packages/time/src/index.ts`
- Create: `packages/time/CLAUDE.md`
- Create: `packages/time/test/calendarDay.test.ts`
- Create: `packages/time/test/recurrence.test.ts`
- Delete: `packages/shared/src/utils/dateTimezoneUtils.ts`
- Delete: `packages/shared/src/utils/recurrenceUtils.ts`
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/package.json`
- Modify: every importer (see Step 5)

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export class DateTimezoneUtils {
    static now(timezone?: string): Date;
    static toCalendarDay(date: string | Date): Date;
    static currentCalendarDay(date: string | Date, timezone?: string): Date;
    static endOfCalendarDay(day: Date): Date;
    static shiftCalendarDays(day: Date, days: number): Date;
    static shiftCalendarMonths(day: Date, months: number): Date;
    static startOfCalendarMonth(day: Date): Date;
    static endOfCalendarMonth(day: Date): Date;
    static isSameCalendarDay(left: Date, right: Date): boolean;
  }
  export class RecurrenceUtils {
    static addPeriod(date: Date | string, every: number, period: SubscriptionPeriod): Date;
    static getNextOccurrence(anchor: Date | string, every: number, period: SubscriptionPeriod, relativeTo?: Date): Date;
    static getPreviousOccurrence(anchor: Date | string, every: number, period: SubscriptionPeriod, relativeTo?: Date): Date;
  }
  ```
  `SubscriptionPeriod` is imported from `@subeye/model` — **but `model` does not yet exist at this task.** Import it from `@subeye/shared` now; Task 3 renames the specifier.

- [ ] **Step 1: Scaffold the package**

Create `packages/time/package.json`:

```json
{
  "name": "@subeye/time",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "dependencies": {
    "@date-fns/tz": "^1.4.1",
    "@subeye/shared": "workspace:*",
    "date-fns": "^4.1.0"
  },
  "scripts": {
    "lint": "biome check .",
    "test": "bun test ./test",
    "type-check": "tsc --noEmit --pretty"
  }
}
```

If Task 0 Step 5 applied, omit `@date-fns/tz`.

Create `packages/time/tsconfig.json` — copy `packages/spend/tsconfig.json` verbatim:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "lib": ["ESNext"],
    "target": "ESNext",
    "module": "ESNext",
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "**/*.test.ts", "dist"]
}
```

- [ ] **Step 2: Move the two util files**

```bash
cd /Users/yehor/Developer/projects/sub-eye
git mv packages/shared/src/utils/dateTimezoneUtils.ts packages/time/src/calendarDay.ts
git mv packages/shared/src/utils/recurrenceUtils.ts packages/time/src/recurrence.ts
```

In `packages/time/src/recurrence.ts`, change the `SubscriptionPeriod` import to come from `@subeye/shared` instead of the old relative path.

Create `packages/time/src/index.ts`:

```ts
export * from "./calendarDay";
export * from "./recurrence";
```

- [ ] **Step 3: Write the failing regression test for the host-timezone trap**

This is the invariant that has no test today and is the single most likely thing to break as new call sites appear. `RecurrenceUtils` uses host-local getters (`getDate()`, `getMonth()`, `setDate()`) and is only UTC-safe because callers feed it a `TZDate`-in-UTC from `toCalendarDay`.

Create `packages/time/test/recurrence.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { SubscriptionPeriod } from "@subeye/shared";
import { DateTimezoneUtils, RecurrenceUtils } from "../src";

describe("RecurrenceUtils", () => {
  // A raw ISO string handed straight to getNextOccurrence resolves in the HOST
  // zone; only a value that has been through toCalendarDay is zone-stable. This
  // asserts the safe path, and is the test that fails if someone removes the
  // toCalendarDay funnel from a call site.
  test("a calendar-day anchor projects identically in any host zone", () => {
    const anchor = DateTimezoneUtils.toCalendarDay("2026-01-31");
    const relativeTo = DateTimezoneUtils.toCalendarDay("2026-04-10");

    const next = RecurrenceUtils.getNextOccurrence(
      anchor,
      1,
      SubscriptionPeriod.MONTH,
      relativeTo,
    );

    expect(next.toISOString()).toBe("2026-04-30T00:00:00.000Z");
  });

  // Jan 31 + 1 month must clamp to Feb 28, and the NEXT step must measure from
  // the anchor again — stepping from the clamped value would drag every later
  // occurrence back to the 28th.
  test("a clamped month does not drag later occurrences back", () => {
    const anchor = DateTimezoneUtils.toCalendarDay("2026-01-31");

    const feb = RecurrenceUtils.addPeriod(anchor, 1, SubscriptionPeriod.MONTH);
    const mar = RecurrenceUtils.addPeriod(anchor, 2, SubscriptionPeriod.MONTH);

    expect(feb.toISOString()).toBe("2026-02-28T00:00:00.000Z");
    expect(mar.toISOString()).toBe("2026-03-31T00:00:00.000Z");
  });
});
```

- [ ] **Step 4: Run the test under two host zones to verify it passes in both**

Run:

```bash
bun test packages/time/test
```

Then:

```bash
TZ=America/Los_Angeles bun test packages/time/test
```

Expected: both PASS, identical output. If the second fails, a call site is bypassing `toCalendarDay` — fix that before continuing, do not weaken the test.

- [ ] **Step 5: Repoint every importer**

`DateTimezoneUtils` and `RecurrenceUtils` are currently re-exported from the `@subeye/shared` barrel, so importers name `@subeye/shared`. Add `@subeye/time` as a dependency of every workspace that uses them, then sweep:

```bash
cd /Users/yehor/Developer/projects/sub-eye
grep -rln "DateTimezoneUtils\|RecurrenceUtils" apps packages --include=*.ts --include=*.tsx | grep -v node_modules
```

For each file the grep lists, split the import: symbols owned by `time` come from `@subeye/time`, everything else stays on `@subeye/shared`. Add `"@subeye/time": "workspace:*"` to the `dependencies` of `packages/spend/package.json`, `packages/pricing/package.json`, `apps/server/package.json`, and `apps/landing/package.json` if the grep hit them.

Remove the two moved lines from `packages/shared/src/index.ts`:

```ts
export * from "./domains/analytics";
export * from "./domains/apiError";
export * from "./domains/category";
export * from "./domains/subscription";
export * from "./schemas/userSchemas";
export * from "./types";
export * from "./utils/currencyUtils";
export * from "./utils/dateFormatUtils";
```

`packages/shared/src/domains/subscription/subscriptionLifecycle.ts` and `subscriptionStatus.ts` both import `DateTimezoneUtils` from `../../utils/dateTimezoneUtils` — repoint them to `@subeye/time` and add `"@subeye/time": "workspace:*"` to `packages/shared/package.json`.

- [ ] **Step 6: Install and run all four gates**

```bash
bun install
bun run type-check && bun run test && bun run check:boundaries && bun run check:circular
```

Expected: all four green. `check:circular` currently has no target for the new package — that is fine, Task 11 adds it.

- [ ] **Step 7: Write `packages/time/CLAUDE.md`**

```markdown
# @subeye/time — calendar days and recurrence

A calendar day is UTC midnight. An instant is an instant. This package holds the
line between them, and every other package depends on it holding.

## Invariants

- `toCalendarDay` floors to UTC midnight and returns the canonical `Z` form.
  It is the ONLY correct way to build an anchor for `RecurrenceUtils`.
- `RecurrenceUtils` uses host-local getters. It is zone-stable ONLY because
  callers hand it a value that has already been through `toCalendarDay`. That
  invariant is enforced by convention, not by the type system — it is the single
  thing most likely to break as new call sites appear. `test/recurrence.test.ts`
  pins it; run the suite under `TZ=America/Los_Angeles` as well as UTC.
- Occurrences are always measured FROM the anchor, never by repeated stepping.
  Stepping lets a clamped month (Jan 31 → Feb 28) drag every later occurrence
  back with it.
- `now` is a parameter. This package never reads a clock except in
  `DateTimezoneUtils.now`, which exists to be that clock for callers that want one.

## Hermes

<record the Task 0 probe result here>
```

- [ ] **Step 8: Commit**

```bash
git add packages/time packages/shared packages/spend packages/pricing apps package.json bun.lock
git commit -m "refactor(time): extract calendar-day and recurrence into @subeye/time"
```

---

## Task 2: `packages/money`

Absorbs `packages/currency` (15 lines, a naked type), `CurrencyUtils`, and the cross-rate derivation currently stranded in the server.

**Files:**
- Create: `packages/money/package.json`, `tsconfig.json`, `CLAUDE.md`
- Create: `packages/money/src/rateTable.ts` (moved), `src/currency.ts` (moved), `src/fxDocument.ts`, `src/index.ts`
- Create: `packages/money/test/crossRates.test.ts` (moved)
- Delete: `packages/currency/` entirely
- Delete: `packages/shared/src/utils/currencyUtils.ts`
- Modify: `apps/server/src/domains/currency/currencyService.ts`
- Modify: importers of `@subeye/currency` and `CurrencyUtils`

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export type RateTable = Record<string, number>;
  export class CurrencyUtils {
    static readonly DEFAULT_CURRENCY_CODE: "uah";
    static toMonthly(amount: number, every: number, period: SubscriptionPeriod): number;
    static normalizeCode(code: string | undefined | null): string;
    static convert(amount: number, from: string, to: string, rates: RateTable): number;
  }
  export type FxDocument = { date: string } & Record<string, string | Record<string, number>>;
  export const STORED_BASE = "usd";
  export const fxDocumentUrl: (version: string) => string;
  export const fxVersionCandidates: (now: Date) => string[];
  export const readFxDocument: (document: FxDocument) => { rates: RateTable; rateDate: string } | null;
  export const deriveRatesFor: (target: string, usdRates: RateTable) => RateTable;
  ```

- [ ] **Step 1: Scaffold and move**

Create `packages/money/package.json`:

```json
{
  "name": "@subeye/money",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "dependencies": {
    "@subeye/shared": "workspace:*"
  },
  "scripts": {
    "lint": "biome check .",
    "test": "bun test ./test",
    "type-check": "tsc --noEmit --pretty"
  }
}
```

Copy `packages/spend/tsconfig.json` to `packages/money/tsconfig.json` verbatim.

```bash
cd /Users/yehor/Developer/projects/sub-eye
git mv packages/currency/src/rateTable.ts packages/money/src/rateTable.ts
git mv packages/shared/src/utils/currencyUtils.ts packages/money/src/currency.ts
git rm -r packages/currency
git mv apps/server/test/currency-cross-rates.test.ts packages/money/test/crossRates.test.ts
```

Create `packages/money/src/index.ts`:

```ts
export * from "./currency";
export * from "./fxDocument";
export * from "./rateTable";
```

In `packages/money/src/rateTable.ts`, delete the trailing doc paragraph that says rate IO lives in `apps/server` — it now lives in `fxDocument.ts` beside it. Keep the paragraph explaining that converting *into* the base is a division; that one earns its place.

- [ ] **Step 2: Write the failing test for the pure FX document reader**

`readFxDocument` and `fxVersionCandidates` are new — they are the pure half of `CurrencyService.refreshRates`, split out so the fetch stays in the caller.

Append to `packages/money/test/crossRates.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import {
  fxVersionCandidates,
  readFxDocument,
  STORED_BASE,
} from "../src";

describe("readFxDocument", () => {
  test("pulls the stored base's table and the document date", () => {
    const result = readFxDocument({
      date: "2026-08-24",
      [STORED_BASE]: { uah: 41.2, eur: 0.86 },
    });

    expect(result).toEqual({
      rates: { uah: 41.2, eur: 0.86 },
      rateDate: "2026-08-24",
    });
  });

  // A malformed document must not throw on a background refresh path — the
  // caller falls through to the next version candidate instead.
  test("returns null when the base key is missing or not an object", () => {
    expect(readFxDocument({ date: "2026-08-24" })).toBeNull();
    expect(
      readFxDocument({ date: "2026-08-24", [STORED_BASE]: "nope" }),
    ).toBeNull();
  });
});

describe("fxVersionCandidates", () => {
  // The publisher's immutable build can lag the UTC date, so yesterday is tried
  // before falling back to the mutable `latest` tag.
  test("today, then yesterday, then latest", () => {
    expect(fxVersionCandidates(new Date("2026-03-01T04:00:00.000Z"))).toEqual([
      "2026.3.1",
      "2026.2.28",
      "latest",
    ]);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `bun test packages/money/test`

Expected: FAIL — `Export named 'readFxDocument' not found in module`.

- [ ] **Step 4: Write `packages/money/src/fxDocument.ts`**

```ts
import type { RateTable } from "./rateTable";
import { CurrencyUtils } from "./currency";

/**
 * The base currency actually stored. Every other base is derived from this one
 * document, so a refresh is a single fetch and a single row.
 */
export const STORED_BASE = "usd";

export type FxDocument = { date: string } & Record<
  string,
  string | Record<string, number>
>;

/**
 * Version-pinned to an immutable, date-tagged build rather than `@latest`.
 * `@latest` was previously fetched on the critical path of every read, with a
 * module-level cache that ephemeral Worker isolates mostly missed.
 */
export const fxDocumentUrl = (version: string): string =>
  `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${version}/v1/currencies/${STORED_BASE}.json`;

const dateTag = (date: Date): string =>
  `${date.getUTCFullYear()}.${date.getUTCMonth() + 1}.${date.getUTCDate()}`;

export const fxVersionCandidates = (now: Date): string[] => [
  dateTag(now),
  dateTag(new Date(now.getTime() - 24 * 60 * 60 * 1000)),
  "latest",
];

export const readFxDocument = (
  document: FxDocument,
): { rates: RateTable; rateDate: string } | null => {
  const rates = document[STORED_BASE];
  if (typeof rates !== "object" || rates === null) return null;

  return {
    rates,
    rateDate: typeof document.date === "string" ? document.date : "",
  };
};

/**
 * Re-express a USD-based rate document with `target` as the base.
 *
 * `usdRates[x]` means "units of x per 1 USD". `CurrencyUtils.convert` computes
 * `amount / rates[from]`, so `rates[from]` must mean "units of `from` per 1 unit
 * of `to`" — which is `usdRates[from] / usdRates[to]`. Getting this direction
 * wrong inverts every conversion in the app without ever throwing.
 */
export const deriveRatesFor = (
  target: string,
  usdRates: RateTable,
): RateTable => {
  const code = CurrencyUtils.normalizeCode(target);
  const divisor = usdRates[code];

  if (!Number.isFinite(divisor) || divisor === 0) return {};

  const derived: RateTable = {};
  for (const [key, value] of Object.entries(usdRates)) {
    if (!Number.isFinite(value) || value === 0) continue;
    derived[key] = value / (divisor as number);
  }
  return derived;
};
```

- [ ] **Step 5: Run to verify it passes**

Run: `bun test packages/money/test`

Expected: PASS, including the moved cross-rate cases.

- [ ] **Step 6: Repoint importers and shrink the server's currency service**

```bash
grep -rln "@subeye/currency\|CurrencyUtils" apps packages --include=*.ts --include=*.tsx | grep -v node_modules
```

Repoint each to `@subeye/money`, add `"@subeye/money": "workspace:*"` to `packages/spend/package.json`, `packages/pricing/package.json` and `apps/server/package.json`, and drop `"@subeye/currency"` from every `dependencies` block.

Rewrite `apps/server/src/domains/currency/currencyService.ts` so the pure half is gone and only the fetch and the repository call remain: it imports `deriveRatesFor`, `fxDocumentUrl`, `fxVersionCandidates`, `readFxDocument` and `STORED_BASE` from `@subeye/money`. Delete the local `dateTag`, `cdnUrl`, `RatesDocument` and `deriveRatesFor`. `getRates` keeps its behaviour exactly: a missing `fx_rates` row logs and returns `{}` so conversion degrades to 1:1 rather than inventing a number.

Delete the `export * from "./utils/currencyUtils";` line from `packages/shared/src/index.ts`.

- [ ] **Step 7: Run all four gates**

```bash
bun install
bun run type-check && bun run test && bun run check:boundaries && bun run check:circular
```

Expected: all green.

- [ ] **Step 8: Write `packages/money/CLAUDE.md`**

```markdown
# @subeye/money — codes, rates, conversion

## Invariants

- Currency codes are LOWERCASE everywhere. `normalizeCode` on every read and
  every write; a mixed-case code silently misses every rate lookup.
- A `RateTable` value is "units of that currency per one unit of the base", so
  converting INTO the base is a DIVISION. Inverting this breaks every amount in
  the app without throwing. `test/crossRates.test.ts` pins the direction.
- A missing rate degrades to 1:1 and never throws. An unconverted amount on the
  dashboard beats an error screen. Do not make it throw.
- This package parses an FX document; it never fetches one. The caller owns the
  network, the timeout and the cache — that is what lets the same code run on a
  Worker cron and on a phone.
```

- [ ] **Step 9: Commit**

```bash
git add packages/money packages/shared packages/spend packages/pricing apps package.json bun.lock
git commit -m "refactor(money): fold @subeye/currency and FX derivation into @subeye/money"
```

---

## Task 3: `packages/model`

Rename `@subeye/shared` to `@subeye/model` now that the four utils have left. What remains is exactly the contract layer: records, DTOs, valibot schemas, enums, the two status vocabularies.

**Files:**
- Rename: `packages/shared/` → `packages/model/`
- Modify: every file importing `@subeye/shared` (~80 across `apps/mobile`, `apps/server`, `apps/landing`, `packages/*`)

**Interfaces:**
- Consumes: nothing.
- Produces: every symbol `@subeye/shared` exports today, minus `DateTimezoneUtils`, `RecurrenceUtils` and `CurrencyUtils`. Notably: `SubscriptionDto`, `PricePhaseDto`, `CategoryDto`, `UserPreferences`, `SubscriptionPeriod`, `subscriptionStatuses`, `SubscriptionStatus`, `subscriptionAllowedActions`, `SubscriptionAllowedAction`, `CATEGORY_EMOJIS`, `CATEGORY_EMOJI_GROUPS`, `AddSubscriptionSchema`, `UpdateSubscriptionSchema`, `StartPhaseSchema`, `ApiError` types, `DashboardAnalyticsDto`, `MonthlySpendSummaryDto`, `WeeklyRenewalsSummaryDto`.

Note `subscriptionLifecycle.ts` and `subscriptionStatus.ts` still live here after this task. Task 4 moves them.

- [ ] **Step 1: Move the directory and rename the package**

```bash
cd /Users/yehor/Developer/projects/sub-eye
git mv packages/shared packages/model
```

In `packages/model/package.json`, change `"name": "@subeye/shared"` to `"name": "@subeye/model"`.

- [ ] **Step 2: Sweep every specifier**

```bash
cd /Users/yehor/Developer/projects/sub-eye
grep -rl '@subeye/shared' apps packages --include=*.ts --include=*.tsx --include=*.astro --include=*.json \
  | grep -v node_modules \
  | xargs sed -i '' 's|@subeye/shared|@subeye/model|g'
```

This also rewrites the `dependencies` keys in every `package.json`, which is intended.

- [ ] **Step 3: Reinstall and verify the workspace resolves**

```bash
bun install
bun run type-check
```

Expected: PASS. A failure here means a specifier the sweep missed — most likely a template literal or a comment. `grep -rn '@subeye/shared' apps packages | grep -v node_modules` finds it.

- [ ] **Step 4: Correct the CLAUDE.md title**

The file moved with the directory in Step 1; only its contents are stale. Change the heading from `# @subeye/shared — schemas, DTOs, and the status vocabulary` to `# @subeye/model — records, DTOs, and the status vocabulary`, and delete any sentence describing the date, recurrence or currency utils — they are three packages away now.

- [ ] **Step 5: Run all four gates**

```bash
bun run type-check && bun run test && bun run check:boundaries && bun run check:circular
```

Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add -A packages apps package.json bun.lock
git commit -m "refactor(model): rename @subeye/shared to @subeye/model"
```

---

## Task 4: `packages/lifecycle`

Brings the status derivation (currently in `model`) together with the transition rules (currently async service methods in `apps/server`), and makes the transitions **pure**.

**Files:**
- Create: `packages/lifecycle/package.json`, `tsconfig.json`, `CLAUDE.md`
- Create: `packages/lifecycle/src/status.ts`, `src/lifecycleStatus.ts`, `src/transitions.ts`, `src/index.ts`
- Create: `packages/lifecycle/test/transitions.test.ts`
- Move: `packages/model/src/domains/subscription/subscriptionStatus.ts` → `packages/lifecycle/src/status.ts`
- Move: `packages/model/src/domains/subscription/subscriptionLifecycle.ts` → `packages/lifecycle/src/lifecycleStatus.ts`
- Move: `apps/server/test/allowed-actions.test.ts` → `packages/lifecycle/test/allowedActions.test.ts`
- Move: `apps/server/test/subscription-status-derivation.test.ts` → `packages/lifecycle/test/status.test.ts`
- Modify: `apps/server/src/domains/subscription/subscriptionService.ts`
- Modify: `packages/model/src/domains/subscription/index.ts`

**Interfaces:**
- Consumes: `@subeye/model` (`SubscriptionPeriod`, `SubscriptionStatus`), `@subeye/time` (`DateTimezoneUtils`, `RecurrenceUtils`).
- Produces:
  ```ts
  // moved, signatures unchanged
  export const subscriptionStatuses: readonly ["active","paused","cancelling","cancelled"];
  export type SubscriptionStatus = (typeof subscriptionStatuses)[number];
  export const deriveSubscriptionStatus: (input: StatusInput, now?: Date, timezone?: string) => SubscriptionStatus;
  export const subscriptionAllowedActions: readonly SubscriptionAllowedAction[];
  export const getAllowedActions: (input: { status: SubscriptionStatus; hasPendingPhase: boolean }) => SubscriptionAllowedAction[];
  export const getSubscriptionLifecycleStatus: (input: LifecycleInput, now?: Date, timezone?: string) => SubscriptionLifecycleStatus;
  export const isCurrentlyActiveSubscription: (status: SubscriptionStatus) => boolean;
  export const shouldIncludeOccurrence: (input: LifecycleInput, occurrence: Date) => boolean;

  // new — pure transitions
  export type TransitionInput = {
    paymentDate: string;
    every: number;
    period: SubscriptionPeriod;
    willBeCancelledAt: string | null;
    pausedAt: string | null;
    resumeAt: string | null;
  };
  export type TransitionPatch = Partial<Pick<TransitionInput,
    "paymentDate" | "willBeCancelledAt" | "pausedAt" | "resumeAt">>;

  export const cancel: (sub: TransitionInput, mode: "periodEnd" | "immediate", now: Date, timezone?: string) => TransitionPatch;
  export const renew: (sub: TransitionInput, paymentDate: string | null, now: Date) => TransitionPatch;
  export const pause: (sub: TransitionInput, resumeAt: string | null, now: Date, timezone?: string) => TransitionPatch | null;
  export const resume: (sub: TransitionInput, now: Date, timezone?: string) => TransitionPatch | null;
  ```
  `pause` and `resume` return `null` when the transition is illegal for the record's current status — a pure function reports a caller error by returning `null`, and the caller converts that into a domain error. `null` from `pause` means `AlreadyPausedError`; `null` from `resume` means `NotPausedError`.

- [ ] **Step 1: Scaffold and move the two status files**

Create `packages/lifecycle/package.json`:

```json
{
  "name": "@subeye/lifecycle",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "dependencies": {
    "@subeye/model": "workspace:*",
    "@subeye/time": "workspace:*"
  },
  "scripts": {
    "lint": "biome check .",
    "test": "bun test ./test",
    "type-check": "tsc --noEmit --pretty"
  }
}
```

Copy `packages/spend/tsconfig.json` to `packages/lifecycle/tsconfig.json` verbatim.

```bash
cd /Users/yehor/Developer/projects/sub-eye
git mv packages/model/src/domains/subscription/subscriptionStatus.ts packages/lifecycle/src/status.ts
git mv packages/model/src/domains/subscription/subscriptionLifecycle.ts packages/lifecycle/src/lifecycleStatus.ts
git mv apps/server/test/allowed-actions.test.ts packages/lifecycle/test/allowedActions.test.ts
git mv apps/server/test/subscription-status-derivation.test.ts packages/lifecycle/test/status.test.ts
```

Create `packages/lifecycle/src/index.ts`:

```ts
export * from "./lifecycleStatus";
export * from "./status";
export * from "./transitions";
```

Remove the two moved lines from `packages/model/src/domains/subscription/index.ts`:

```ts
export * from "./pricePhaseSchemas";
export * from "./queryParams";
export * from "./subscriptionBillingSchemas";
export * from "./subscriptionSchemas";
```

- [ ] **Step 2: Break the resulting cycle**

`packages/model/src/db`-facing schemas and `apps/server/src/db/schema.ts` both import `subscriptionStatuses` from `@subeye/model`. They now import it from `@subeye/lifecycle`. But `lifecycle` depends on `model`, so `model` must not import `lifecycle`.

Sweep and repoint:

```bash
grep -rln "subscriptionStatuses\|SubscriptionStatus\|deriveSubscriptionStatus\|getAllowedActions\|subscriptionAllowedActions\|SubscriptionAllowedAction\|isCurrentlyActiveSubscription\|shouldIncludeOccurrence\|getSubscriptionLifecycleStatus" apps packages --include=*.ts --include=*.tsx | grep -v node_modules
```

Add `"@subeye/lifecycle": "workspace:*"` to `packages/spend/package.json`, `apps/server/package.json` and `apps/mobile/package.json`.

If any file in `packages/model/src` still needs `SubscriptionStatus`, that is a real cycle: move the *type alias only* into `packages/model/src/types/enums.ts` and have `lifecycle` re-export it. Do not add an exception to dependency-cruiser.

- [ ] **Step 3: Write the failing transitions test**

Create `packages/lifecycle/test/transitions.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { SubscriptionPeriod } from "@subeye/model";
import { cancel, pause, renew, resume } from "../src";

const base = {
  paymentDate: "2026-09-15T00:00:00.000Z",
  every: 1,
  period: SubscriptionPeriod.MONTH,
  willBeCancelledAt: null,
  pausedAt: null,
  resumeAt: null,
};

describe("cancel", () => {
  // "Access ends now" must floor to the account's current calendar DAY, not the
  // instant. Left unfloored it reads as `cancelling` for the rest of that day —
  // a subscription the user just killed still advertising itself as live.
  test("immediate ends on today's calendar day", () => {
    const patch = cancel(base, "immediate", new Date("2026-08-24T18:30:00.000Z"));
    expect(patch.willBeCancelledAt).toBe("2026-08-24T00:00:00.000Z");
  });

  test("periodEnd ends when the current paid period does", () => {
    const patch = cancel(base, "periodEnd", new Date("2026-08-24T18:30:00.000Z"));
    expect(patch.willBeCancelledAt).toBe("2026-09-15T00:00:00.000Z");
  });
});

describe("renew", () => {
  // Renew clears BOTH the cancellation and the pause. Clearing only the
  // cancellation leaves a subscription that reads active and bills nothing.
  test("clears cancellation and pause together", () => {
    const patch = renew(
      { ...base, willBeCancelledAt: "2026-09-15T00:00:00.000Z", pausedAt: "2026-08-01T09:00:00.000Z", resumeAt: null },
      null,
      new Date("2026-08-24T00:00:00.000Z"),
    );
    expect(patch.willBeCancelledAt).toBeNull();
    expect(patch.pausedAt).toBeNull();
    expect(patch.resumeAt).toBeNull();
  });

  test("re-anchors the cycle when given a past start date", () => {
    const patch = renew(base, "2026-08-03T00:00:00.000Z", new Date("2026-08-24T00:00:00.000Z"));
    expect(patch.paymentDate).toBe("2026-08-03T00:00:00.000Z");
  });

  // A null paymentDate must leave the anchor ALONE, not write undefined over it.
  // A `cancelling` subscription never stopped billing, so moving its anchor
  // would shift a cycle that was never interrupted.
  test("omits paymentDate entirely when none is given", () => {
    const patch = renew(base, null, new Date("2026-08-24T00:00:00.000Z"));
    expect("paymentDate" in patch).toBe(false);
  });
});

describe("pause", () => {
  // pausedAt is an INSTANT and must stay one. Floored to its day it reads as
  // "paused since midnight", and a charge actually taken that morning would be
  // excluded from spend — a pause silently rewriting money already spent.
  test("records the instant, not the day", () => {
    const patch = pause(base, null, new Date("2026-08-24T18:30:00.000Z"));
    expect(patch?.pausedAt).toBe("2026-08-24T18:30:00.000Z");
    expect(patch?.resumeAt).toBeNull();
  });

  // The guard is "already paused", NOT "not active". A `cancelling`
  // subscription can be paused by the service today — getAllowedActions does not
  // offer it, so no UI reaches it, but the service permits it and this port must
  // not quietly change that. See the note in Step 5.
  test("returns null only when already paused", () => {
    const paused = { ...base, pausedAt: "2026-08-01T09:00:00.000Z" };
    expect(pause(paused, null, new Date("2026-08-24T00:00:00.000Z"))).toBeNull();

    const cancelling = { ...base, willBeCancelledAt: "2026-09-15T00:00:00.000Z" };
    expect(pause(cancelling, null, new Date("2026-08-24T00:00:00.000Z"))).not.toBeNull();
  });

  // resumeAt is stored as the caller sent it. The client floors it with
  // toIsoDay and the valibot schema validates it; the service does not floor
  // again, and adding a floor here would be a behaviour change, not a port.
  test("passes resumeAt through unfloored", () => {
    const patch = pause(base, "2026-10-01T00:00:00.000Z", new Date("2026-08-24T18:30:00.000Z"));
    expect(patch?.resumeAt).toBe("2026-10-01T00:00:00.000Z");
  });
});

describe("resume", () => {
  // The anchor must roll forward past the pause window, or the next payment
  // date still points at a charge that never happened.
  test("rolls the payment date past the pause", () => {
    const paused = {
      ...base,
      paymentDate: "2026-06-15T00:00:00.000Z",
      pausedAt: "2026-06-01T09:00:00.000Z",
      resumeAt: null,
    };
    const patch = resume(paused, new Date("2026-08-24T00:00:00.000Z"));
    expect(patch?.paymentDate).toBe("2026-09-15T00:00:00.000Z");
    expect(patch?.pausedAt).toBeNull();
    expect(patch?.resumeAt).toBeNull();
  });

  test("returns null when the subscription is not paused", () => {
    expect(resume(base, new Date("2026-08-24T00:00:00.000Z"))).toBeNull();
  });
});
```

- [ ] **Step 4: Run to verify it fails**

Run: `bun test packages/lifecycle/test/transitions.test.ts`

Expected: FAIL — `Export named 'cancel' not found in module`.

- [ ] **Step 5: Write `packages/lifecycle/src/transitions.ts`**

Port the bodies from `apps/server/src/domains/subscription/subscriptionService.ts` — `applyCancellation` (lines 329–383), `renewSubscription` (406–442), `pauseSubscription` (443–485), `resumeSubscription` (486–530) — stripping every `await`, every repository call and every ownership check. Each becomes a synchronous function returning the patch.

```ts
import { SubscriptionPeriod } from "@subeye/model";
import { DateTimezoneUtils, RecurrenceUtils } from "@subeye/time";
import { deriveSubscriptionStatus } from "./status";

export type TransitionInput = {
  paymentDate: string;
  every: number;
  period: SubscriptionPeriod;
  willBeCancelledAt: string | null;
  pausedAt: string | null;
  resumeAt: string | null;
};

export type TransitionPatch = Partial<
  Pick<TransitionInput, "paymentDate" | "willBeCancelledAt" | "pausedAt" | "resumeAt">
>;

/**
 * Through `new Date` first: a `TZDate`'s own `toISOString()` emits the offset
 * form (`…+00:00`), and these strings are compared and sliced as plain UTC
 * instants by both clients. Every date leaving this module goes through here.
 */
const iso = (day: Date): string => new Date(day.getTime()).toISOString();

/** The next occurrence at or after the account's current calendar day. */
const nextOccurrence = (
  sub: TransitionInput,
  now: Date,
  timezone?: string,
): Date =>
  RecurrenceUtils.getNextOccurrence(
    DateTimezoneUtils.toCalendarDay(sub.paymentDate),
    sub.every,
    sub.period,
    DateTimezoneUtils.currentCalendarDay(now, timezone),
  );

export const cancel = (
  sub: TransitionInput,
  mode: "periodEnd" | "immediate",
  now: Date,
  timezone?: string,
): TransitionPatch => ({
  // The user's calendar DAY, not the instant. `willBeCancelledAt` is a day
  // value everywhere else, and west of UTC a raw instant lands on tomorrow's
  // UTC day — an evening "cancel now" then read as still cancelling until the
  // following morning.
  willBeCancelledAt:
    mode === "immediate"
      ? iso(DateTimezoneUtils.currentCalendarDay(now, timezone))
      : iso(nextOccurrence(sub, now, timezone)),
});

export const renew = (
  sub: TransitionInput,
  paymentDate: string | null,
  _now: Date,
): TransitionPatch => ({
  willBeCancelledAt: null,
  pausedAt: null,
  resumeAt: null,
  // Spread, not a null assignment: a renew with no date must leave the anchor
  // untouched. A `cancelling` subscription never stopped billing, so moving its
  // anchor would shift a cycle that was never interrupted.
  //
  // Stored as the caller sent it. The client floors it with `toIsoDay` and the
  // valibot schema validates it as a past ISO date; flooring again here would
  // be a behaviour change, not a port.
  ...(paymentDate ? { paymentDate } : {}),
});

export const pause = (
  sub: TransitionInput,
  resumeAt: string | null,
  now: Date,
  timezone?: string,
): TransitionPatch | null => {
  // The guard is "already paused" — NOT "not active". See the note below.
  if (deriveSubscriptionStatus(sub, now, timezone) === "paused") return null;

  return {
    // An INSTANT, deliberately. Floored to its day it would read as "paused
    // since midnight", and a charge actually taken that morning would drop out
    // of spend — a pause silently rewriting money already spent.
    pausedAt: now.toISOString(),
    resumeAt: resumeAt ?? null,
  };
};

export const resume = (
  sub: TransitionInput,
  now: Date,
  timezone?: string,
): TransitionPatch | null => {
  if (deriveSubscriptionStatus(sub, now, timezone) !== "paused") return null;

  return {
    // Roll the anchor past the pause window, or the next payment date still
    // points at a charge that never happened.
    paymentDate: iso(nextOccurrence(sub, now, timezone)),
    pausedAt: null,
    resumeAt: null,
  };
};
```

**Four things this block gets right that a naive port gets wrong.** Each was checked against the current server bodies on 2026-08-24; do not "simplify" any of them.

1. **`iso()` normalizes through `new Date`.** `DateTimezoneUtils.toCalendarDay` returns a `TZDate`, whose own `toISOString()` emits `2026-09-15T00:00:00.000+00:00`. Both clients slice and string-compare these as `Z`-form instants. `SubscriptionCalculator.calculatePaymentDates` already does this normalization for the same reason.
2. **`cancel` periodEnd reaches `RecurrenceUtils` directly**, not `SubscriptionCalculator.calculatePaymentDates`, which is what the server calls today. The computation is identical — `calculatePaymentDates` is that call plus the `iso` normalization — but `spend` depends on `lifecycle`, so calling into it here would be a cycle.
3. **`renew` spreads `paymentDate` conditionally and does not floor it.** Writing `paymentDate: null` would erase the anchor; flooring it would change behaviour.
4. **`pause` guards on "already paused", not "not active".** A `cancelling` subscription can be paused by the service today. `getAllowedActions` does not offer `pause` on `cancelling`, so no UI reaches it — but this is a refactor, and tightening a guard here would be a silent behaviour change hiding inside a move. Note it in the commit body as a known inconsistency to resolve deliberately later, and leave it alone.

- [ ] **Step 6: Run to verify it passes**

Run: `bun test packages/lifecycle/test`

Expected: PASS — all of `transitions.test.ts`, `status.test.ts` and `allowedActions.test.ts`.

Then: `TZ=America/Los_Angeles bun test packages/lifecycle/test` — also PASS, identical.

- [ ] **Step 7: Rewire the server's service to call them**

In `apps/server/src/domains/subscription/subscriptionService.ts`, replace the four method bodies with a read, a call, and a write. `pauseSubscription` becomes: load the record, load preferences **before** the guard, call `pause(record, payload.resumeAt ?? null, new Date(), preferences.preferredTimezone)`, throw `AlreadyPausedError` if it returned `null`, otherwise `repository.update(id, { ...patch, status: deriveSubscriptionStatus({ ...record, ...patch }, now, tz) })`, then map to a DTO.

Preferences must stay loaded before the guard — the existing comment says why, and it is a live bug the ordering prevents: the guard and the DTO's `status` have to answer "is this paused" in the same calendar, or for a few hours around a resume date the list advertises `pause` and the call throws `AlreadyPausedError`.

`renewSubscription` today writes `status: "active"` literally rather than deriving it. Deriving gives the same answer for every reachable input (renew clears both the cancellation and the pause, so `deriveSubscriptionStatus` returns `active`), and deriving is the invariant the other three follow — switch it, and let `lifecycle-writes-status-column.test.ts` confirm.

Delete `applyCancellation` and the four inlined rule bodies. Keep `currentStatus`, the ownership checks and the DTO mapping where they are — Task 8 moves them.

- [ ] **Step 8: Run all four gates**

```bash
bun install
bun run type-check && bun run test && bun run check:boundaries && bun run check:circular
```

Expected: all green, including the four server lifecycle tests (`cancel-preserves-pending-phases`, `renew-reanchors-payment-date`, `pause-resume-service`, `lifecycle-writes-status-column`), which still pass through the service.

- [ ] **Step 9: Write `packages/lifecycle/CLAUDE.md`**

```markdown
# @subeye/lifecycle — statuses, legality, and transitions

## Two status vocabularies exist. Do not compare across them.

- `subscriptionStatuses` — `active | paused | cancelling | cancelled`. The
  persisted one. This is what every filter and every guard uses.
- `subscriptionLifecycleStatuses` — `active | cancelledButActive | cancelled`.
  The pre-v4 derived vocabulary, kept because `shouldIncludeOccurrence` is
  consumed by `@subeye/spend`.

Comparing a value from one against a member of the other silently never matches.

## Invariants

- Transitions are PURE: `(record, args, now) → patch | null`. `null` means the
  transition is illegal for that record's current status; the caller turns that
  into a domain error. Never throw from this package.
- Cancellation outranks pause. A subscription that is both is cancelled.
- `pausedAt` is an INSTANT. `willBeCancelledAt` and `resumeAt` are CALENDAR DAYS.
  `deriveSubscriptionStatus` compares each against the right thing, and that is
  the entire reason it takes a `timezone`.
- `getAllowedActions` is the single source of truth for which actions are legal.
  The client renders it; it must never re-derive the rules.
- Renew clears the cancellation AND the pause. Clearing only one leaves a
  subscription that reads active and bills nothing.
```

- [ ] **Step 10: Commit**

```bash
git add packages apps package.json bun.lock
git commit -m "refactor(lifecycle): extract status derivation and pure transitions into @subeye/lifecycle"
```

---

## Task 5: repoint `packages/pricing` and delete its edge to `spend`

`pricing` depends on `spend` today only because `phaseScheduling.resolveNextOccurrenceEffectiveAt` reaches for `SubscriptionCalculator.calculatePaymentDates`. That is recurrence, which now lives in `@subeye/time`, so the edge dissolves.

**Files:**
- Modify: `packages/pricing/package.json`
- Modify: `packages/pricing/src/phaseScheduling.ts`
- Modify: `packages/pricing/CLAUDE.md`

**Interfaces:**
- Consumes: `@subeye/model`, `@subeye/time`, `@subeye/money`. **No longer `@subeye/spend`.**
- Produces: `buildPhaseProjection`, `toStartOfUtcDay`, `isSameUtcDay`, `normalizeIsoDate`, `normalizeAmount`, `getEffectivePhase`, `getUpcomingPhase`, `selectDuePhases` — all unchanged — plus the `PricePhaseInput` / `PhaseRecurrence` / `PhaseProjection` / `ScheduleEffectiveAtRequest` / `PhaseBoundaryLike` types.

  **One signature changes:**
  ```ts
  // before
  resolveScheduledEffectiveAt(subscription: RecurringSubscription, request: ScheduleEffectiveAtRequest, timezone?: string): string | null
  // after
  resolveScheduledEffectiveAt(subscription: PhaseSubject, request: ScheduleEffectiveAtRequest, now: Date, timezone?: string): string | null
  ```
  where `PhaseSubject` is `{ every: number; period: SubscriptionPeriod; paymentDate: string | Date }` declared inside `pricing` (or the existing `PhaseRecurrence`, if that already matches). It replaces `RecurringSubscription`, which belongs to `@subeye/spend`.

- [ ] **Step 1: Write the failing test that pins the injected clock**

`resolveScheduledEffectiveAt` takes no `now` parameter and `phaseScheduling.ts:46` reads `Date.now()` directly, so this cannot be faked today. That violates the purity constraint and makes the function untestable at a day boundary.

The real signature today is `resolveScheduledEffectiveAt(subscription, request, timezone?)`. `now` goes **third**, before the optional `timezone`:

```ts
resolveScheduledEffectiveAt(
  subscription: PhaseSubject,
  request: ScheduleEffectiveAtRequest,
  now: Date,
  timezone?: string,
): string | null
```

Append to `packages/pricing/test/phaseScheduling.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { SubscriptionPeriod } from "@subeye/model";
import { resolveScheduledEffectiveAt } from "../src";

const monthlyOnThe10th = {
  every: 1,
  period: SubscriptionPeriod.MONTH,
  paymentDate: "2026-08-10T00:00:00.000Z",
};

describe("resolveScheduledEffectiveAt with an injected clock", () => {
  test("nextOccurrence returns the renewal still ahead of now", () => {
    expect(
      resolveScheduledEffectiveAt(
        monthlyOnThe10th,
        { mode: "nextOccurrence" },
        new Date("2026-08-24T00:00:00.000Z"),
        "UTC",
      ),
    ).toBe("2026-09-10T00:00:00.000Z");
  });

  // THE CASE THAT WAS UNTESTABLE BEFORE. The next occurrence lands on today,
  // whose midnight has already passed, so it must step forward a full period —
  // a price change must never be scheduled in the past. With `Date.now()` this
  // could not be asserted at all.
  test("steps forward a full period when the renewal is earlier today", () => {
    expect(
      resolveScheduledEffectiveAt(
        monthlyOnThe10th,
        { mode: "nextOccurrence" },
        new Date("2026-09-10T12:00:00.000Z"),
        "UTC",
      ),
    ).toBe("2026-10-10T00:00:00.000Z");
  });

  // The step-forward is anchored to the ORIGINAL payment date, not to the date
  // it stepped from — otherwise a clamped month drags the boundary back.
  test("the step forward stays anchored to the original day-of-month", () => {
    expect(
      resolveScheduledEffectiveAt(
        { every: 1, period: SubscriptionPeriod.MONTH, paymentDate: "2026-01-31T00:00:00.000Z" },
        { mode: "nextOccurrence" },
        new Date("2026-02-28T12:00:00.000Z"),
        "UTC",
      ),
    ).toBe("2026-03-31T00:00:00.000Z");
  });
});
```

The three tests already in this file pass `"UTC"` as the third argument. Update each to pass `now` third and `"UTC"` fourth. While there, make them deterministic: the existing `subscription` fixture anchors at `2020-01-10` and asserts `Date.parse(effectiveAt) > Date.now()`, which was the only assertion possible without an injectable clock. Replace that with an exact expected string now that one exists.

- [ ] **Step 2: Run to verify it fails**

Run: `bun test packages/pricing/test/phaseScheduling.test.ts`

Expected: FAIL — `resolveScheduledEffectiveAt` currently accepts one argument, so the second is ignored and the second case returns the stale date.

- [ ] **Step 3: Add the `now` parameter and swap `spend` for `time`**

In `packages/pricing/src/phaseScheduling.ts`:

- Add `now: Date` as the third parameter of `resolveScheduledEffectiveAt`, before the optional `timezone`, and thread it into both `resolveNextOccurrenceEffectiveAt` call sites.
- Replace `if (Date.parse(nextPaymentDate) > Date.now())` with `if (Date.parse(nextPaymentDate) > now.getTime())`.
- Replace the `SubscriptionCalculator.calculatePaymentDates(subscription, timezone)` call with the equivalent expressed directly against `@subeye/time`:

  ```ts
  const nextPaymentDate = new Date(
    RecurrenceUtils.getNextOccurrence(
      DateTimezoneUtils.toCalendarDay(subscription.paymentDate),
      subscription.every,
      subscription.period,
      DateTimezoneUtils.currentCalendarDay(now, timezone),
    ).getTime(),
  ).toISOString();
  ```

  This is exactly what `calculatePaymentDates` computes — that method is this call plus the `new Date(…).toISOString()` normalization, which is reproduced here. Keep the normalization: `toCalendarDay` returns a `TZDate`, whose own `toISOString()` emits the `+00:00` form rather than `Z`.

- **Replace the `RecurringSubscription` type too.** It is imported from `@subeye/spend`, so swapping only the function call leaves a type edge that `check:boundaries` will still reject. It is a structural type of exactly `{ every, period, paymentDate }`. Check whether `PhaseRecurrence` in `packages/pricing/src/phaseProjection.ts` already has that shape — if it does, reuse it and do not add a second; if it does not, declare a local one in `phaseScheduling.ts` and give it the same one-line comment style (`/** The minimum shape needed to walk a subscription's recurrence. */`).
- Delete the `@subeye/spend` import entirely. `grep -n "@subeye/spend" packages/pricing/src packages/pricing/test` must return nothing.

In `packages/pricing/package.json`, delete `"@subeye/spend": "workspace:*"` and add `"@subeye/time": "workspace:*"` and `"@subeye/money": "workspace:*"`.

- [ ] **Step 4: Run to verify it passes**

Run: `bun test packages/pricing/test`

Expected: PASS, all three files.

- [ ] **Step 5: Fix the one caller**

There is exactly one: `apps/server/src/domains/subscription/subscriptionPhaseService.ts:115`. Insert `new Date()` as the **third** argument, before the timezone argument it already passes. Confirm with `grep -rn "resolveScheduledEffectiveAt" apps packages --include=*.ts | grep -v node_modules` that nothing else calls it.

- [ ] **Step 6: Run all four gates**

```bash
bun install
bun run type-check && bun run test && bun run check:boundaries && bun run check:circular
```

Expected: all green.

- [ ] **Step 7: Update `packages/pricing/CLAUDE.md`**

Delete the "What stays in apps/server, deliberately" section — Task 8 moves all of it into `@subeye/store`. Add one line under Invariants: `resolveScheduledEffectiveAt takes now as a parameter. It used to read Date.now() and could not be tested at a day boundary.`

- [ ] **Step 8: Commit**

```bash
git add packages apps package.json bun.lock
git commit -m "refactor(pricing): inject now and drop the edge to @subeye/spend"
```

---

## Task 6: repoint `packages/spend`

Mechanical. `spend` imports `CurrencyUtils`, `DateTimezoneUtils`, `RecurrenceUtils`, `isCurrentlyActiveSubscription` and `shouldIncludeOccurrence` from what used to be one barrel; they now come from three.

**Files:**
- Modify: `packages/spend/package.json`
- Modify: `packages/spend/src/analyticsCalculator.ts`, `src/pause.ts`, `src/subscriptionCalculator.ts`
- Modify: `packages/spend/CLAUDE.md`

**Interfaces:**
- Consumes: `@subeye/model`, `@subeye/time`, `@subeye/money`, `@subeye/lifecycle`.
- Produces: unchanged — `AnalyticsCalculator`, `SubscriptionCalculator`, `isOccurrencePaused`, `PaymentOccurrence`, `PauseWindow`, `BillableSubscription`, `RecurringSubscription`.

- [ ] **Step 1: Verify the imports — they are probably already correct**

Tasks 1–4 repointed these as a side effect of their own sweeps. Verified on 2026-08-24 at `64a20b4`: `analyticsCalculator.ts` already imports `shouldIncludeOccurrence` from `@subeye/lifecycle` and `DateTimezoneUtils`/`RecurrenceUtils` from `@subeye/time`; `subscriptionCalculator.ts` already imports `CurrencyUtils` and `RateTable` from `@subeye/money`. `packages/spend/package.json` already lists all four workspace deps.

Confirm rather than assume:

```bash
grep -n "from \"@subeye" packages/spend/src/*.ts
```

Expected: only `@subeye/model`, `@subeye/money`, `@subeye/time`, `@subeye/lifecycle`. If something still names a package that no longer exists, repoint it; otherwise this step is a no-op and the real work of this task is Step 2.

**Move `@date-fns/tz` to `devDependencies`.** It is imported by `packages/spend/test/monthEndProjection.test.ts` but by nothing in `src/` — so it cannot simply be deleted, and leaving it in `dependencies` overstates what the package needs at runtime:

```json
"dependencies": {
  "@subeye/lifecycle": "workspace:*",
  "@subeye/model": "workspace:*",
  "@subeye/money": "workspace:*",
  "@subeye/time": "workspace:*",
  "date-fns": "^4.1.0"
},
"devDependencies": {
  "@date-fns/tz": "^1.4.1"
}
```

- [ ] **Step 2: Fix the drifted test fixtures**

`packages/*/tsconfig.json` all exclude `**/*.test.ts`, so test fixtures are never type-checked and three have drifted from the real schemas. This is the substance of Task 6. All three were confirmed against the schemas on 2026-08-24.

- **`userId` does not exist on `SubscriptionDto`.** Confirmed: `grep -n "userId" packages/model/src/domains/subscription/subscriptionSchemas.ts` returns nothing. Delete it from all four sites — `test/monthEndProjection.test.ts:9` and `:100`, `test/categorySpending.test.ts:24` and `:60`.
- **`billing.original` is `{ currencyCode, monthly }` only.** `subscriptionBillingDetailsSchema` is a `strictObject`, and `original` declares exactly those two fields — no `amount`, no `yearly`. `test/pause-occurrences.test.ts` builds an `original` carrying both. Delete the extra fields; `preferred` is the branch that legitimately has `amount`, `monthly`, `yearly` and `exchangeRate`.

Fix the fixture, never the schema. A drifted fixture that a real payload would fail is exactly the kind of misleading reference the store use-cases will be ported against in Task 8.

- [ ] **Step 3: Run the suite**

Run: `bun test packages/spend/test`

Expected: PASS, five files.

- [ ] **Step 4: Run all four gates**

```bash
bun install
bun run type-check && bun run test && bun run check:boundaries && bun run check:circular
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add packages package.json bun.lock
git commit -m "refactor(spend): repoint onto time/money/lifecycle and fix drifted fixtures"
```

---

## Task 6.5: type-check the package tests

Added after Task 6, from its execution report. Small, isolated, its own commit.

**Why it matters now rather than later.** Task 6 spent its substance deleting three fixtures that had drifted from the schemas — a `userId` that does not exist on `SubscriptionDto`, and an `original` branch carrying two fields a `strictObject` rejects. They drifted because `packages/*/tsconfig.json` all exclude `**/*.test.ts`, so no fixture in any package has ever been type-checked. Left alone they simply drift again, and Task 8 ports twelve test files against them.

**Files:**
- Modify: `packages/*/tsconfig.json` (eight of them, after Task 7 creates `reminders`; seven now)
- Modify: `packages/spend/test/monthEndProjection.test.ts`, `packages/spend/test/pause.test.ts`
- Modify: `packages/pricing/package.json`

- [ ] **Step 1: Include tests in each package's type-check**

In every `packages/*/tsconfig.json`, drop `"**/*.test.ts"` from `exclude` and add `"test/**/*"` to `include`. `exclude` keeps `node_modules` and `dist`.

- [ ] **Step 2: See the whole blast radius before fixing anything**

```bash
bun run type-check 2>&1 | tee /tmp/pkg-test-errors.txt; grep -c "error TS" /tmp/pkg-test-errors.txt
```

Two are known and reported from Task 6:
- `packages/spend/test/monthEndProjection.test.ts:232` and `:234` — `trend[0].amount` under `noUncheckedIndexedAccess`. Fix with `trend[0]!.amount`, or destructure with a guard. Do not relax the compiler flag.
- `packages/spend/test/pause.test.ts:61` and `:73` — the `cases` array infers its element type from the first entry, so the null-bearing `PauseWindow` entries do not fit. Annotate the array (`const cases: Array<{ … }> = [...]`) rather than casting each entry.

**If the total is more than about a dozen, stop and report instead of grinding through them.** A large number means a package's tests are further from its own types than this task assumed, and that deserves a decision rather than a sweep.

- [ ] **Step 3: Delete the unused dependency**

`packages/pricing/package.json` still lists `date-fns` and nothing in `packages/pricing` imports it — a leftover from Task 5 dropping the `spend` edge. Confirm, then remove:

```bash
grep -rn "date-fns" packages/pricing/src packages/pricing/test
```

Expected: empty. Then delete the line and `bun install`.

- [ ] **Step 4: Gates**

```bash
bun install
bun run type-check && bun run test && bun run check:boundaries && bun run check:circular
```

- [ ] **Step 5: Commit**

```bash
git add packages
git commit -m "chore(packages): type-check test files and drop an unused dependency"
```

### Explicitly not doing

`resolveNextOccurrenceEffectiveAt` no longer reads a clock, but three explicit `now = new Date()` **default parameters** remain — `phaseProjection.ts:97`, `phaseSelection.ts:20` and `:47`. Leave them. `packages/pricing/CLAUDE.md` sanctions the pattern, every caller can already inject, and a default is an injection point rather than an unfakeable read. Stripping them is a signature change across three server call sites for no testability gain.

---

## Task 7: `packages/reminders`

Extracts the planner out of the mobile app and points it at the tested recurrence engine, killing the private one. Platform scheduling stays in `apps/mobile/src/shared/lib/notifications/`.

**Files:**
- Create: `packages/reminders/package.json`, `tsconfig.json`, `CLAUDE.md`
- Create: `packages/reminders/src/reminder.ts`, `src/planReminders.ts`, `src/settings.ts`, `src/index.ts`
- Move: `apps/mobile/src/shared/lib/notifications/plan.ts` → `packages/reminders/src/planReminders.ts`
- Move: `apps/mobile/src/shared/lib/notifications/settings.ts` → `packages/reminders/src/settings.ts`
- Move: `apps/mobile/src/shared/lib/notifications/plan.test.ts` → `packages/reminders/test/planReminders.test.ts`
- Move: `apps/mobile/src/shared/lib/notifications/settings.test.ts` → `packages/reminders/test/settings.test.ts`
- Modify: `apps/mobile/src/shared/lib/notifications/index.ts`

**Interfaces:**
- Consumes: `@subeye/model`, `@subeye/time`, `@subeye/money`, `@subeye/lifecycle`, `@subeye/pricing`.
- Produces:
  ```ts
  export type ReminderKind = "renewal" | "trialEnd";
  export type ReminderTarget =
    | { screen: "subscription"; id: string }
    | { screen: "due"; date: string }
    | { screen: "list" };
  export type ReminderInput = Pick<SubscriptionDto,
    "id" | "name" | "every" | "period" | "nextPaymentDate" | "status" | "billing"> & {
    pricePhases?: readonly Pick<PricePhaseDto, "kind" | "endsAt" | "isActive">[];
    upcomingPhase?: Pick<PricePhaseDto, "billing"> | null;
  };
  /**
   * The copy the planner needs, injected. Mirrors exactly the `m.notif_*`
   * functions `describe()` calls today, plus money formatting.
   */
  export type ReminderCopy = {
    whenToday(): string;
    whenTomorrow(): string;
    whenInDays(a: { days: number }): string;
    renewalTitle(a: { name: string; when: string }): string;
    renewalBody(a: { amount: string }): string;
    renewalBodyNoAmount(): string;
    trialTitle(a: { name: string; when: string }): string;
    trialBody(a: { amount: string }): string;
    trialBodyNoAmount(): string;
    renewalDigestTitle(a: { when: string }): string;
    renewalDigestTitleMixed(): string;
    trialDigestTitle(a: { when: string }): string;
    trialDigestTitleMixed(): string;
    digestBody(a: { names: string; amount: string }): string;
    digestMore(a: { names: string; count: number }): string;
    money(amount: number, currency: string): string;
  };
  export type Reminder = {
    kind: ReminderKind;
    fireAt: Date;
    title: string;
    body: string;
    target: ReminderTarget;
  };
  export const REMINDER_BUDGET: 56;
  export const REMINDER_LOOKAHEAD: 3;
  export const planReminders: (
    subscriptions: readonly ReminderInput[],
    settings: ReminderSettings,
    now: Date,
    copy: ReminderCopy,
    budget?: number,
  ) => Reminder[];
  export type ReminderSettings = {
    renewals: boolean; trials: boolean;
    renewalLeadDays: number[]; trialLeadDays: number[];
    hour: number; minute: number;
  };
  export const DEFAULT_REMINDER_SETTINGS: ReminderSettings;
  export const FREE_LEAD_DAYS: readonly [1];
  export const LEAD_DAY_CHOICES: readonly number[];
  export const effectiveSettings: (stored: ReminderSettings, isPro: boolean) => ReminderSettings;
  export const toggleLeadDay: (days: number[], day: number) => number[];
  ```

**The one structural change: the copy renderer is injected, not imported.** `Reminder` keeps its rendered `title` and `body` exactly as today — what changes is where the strings come from.

`describe()` currently calls fourteen `m.notif_*` functions plus `formatMoney`. A pure package cannot import `@/shared/i18n`, because paraglide's `m` is generated into the mobile app and reaches `expo-localization`. So `planReminders` takes a `ReminderCopy` object as its fourth parameter, and the mobile adapter builds one from `m` and `formatMoney` in about fifteen lines.

**Do not replace `title`/`body` with a descriptor object.** An earlier draft of this plan did, and it was wrong: `apps/mobile/src/shared/lib/notifications/plan.test.ts` asserts fourteen exact rendered strings (`"Netflix renews tomorrow"`, `"a, b, c and 2 more · ₴500.00"`, `"trial no amount"`, …), and a descriptor return would have thrown all of them away at the exact moment the trickiest function in the file was being moved. Injection keeps every one of those assertions intact — and *removes* the `mock.module("@/shared/i18n", …)` call at the top of that test, because the stub object it already defines becomes a plain argument.

`describe()` has **six** branches — single/digest × renewal/trial, with the digest splitting again on same-day vs mixed-day — and each one picks a different title, a different body and a different `target`. Every branch must survive the move unchanged.

- [ ] **Step 1: Scaffold and move**

Create `packages/reminders/package.json`:

```json
{
  "name": "@subeye/reminders",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "dependencies": {
    "@subeye/lifecycle": "workspace:*",
    "@subeye/model": "workspace:*",
    "@subeye/money": "workspace:*",
    "@subeye/pricing": "workspace:*",
    "@subeye/time": "workspace:*"
  },
  "scripts": {
    "lint": "biome check .",
    "test": "bun test ./test",
    "type-check": "tsc --noEmit --pretty"
  }
}
```

Copy `packages/spend/tsconfig.json` to `packages/reminders/tsconfig.json` verbatim.

```bash
cd /Users/yehor/Developer/projects/sub-eye
git mv apps/mobile/src/shared/lib/notifications/plan.ts packages/reminders/src/planReminders.ts
git mv apps/mobile/src/shared/lib/notifications/settings.ts packages/reminders/src/settings.ts
git mv apps/mobile/src/shared/lib/notifications/plan.test.ts packages/reminders/test/planReminders.test.ts
git mv apps/mobile/src/shared/lib/notifications/settings.test.ts packages/reminders/test/settings.test.ts
```

Create `packages/reminders/src/index.ts`:

```ts
export * from "./planReminders";
export * from "./reminder";
export * from "./settings";
```

- [ ] **Step 2: Write the failing test for the shared recurrence engine**

Two things happen in this step, in this order.

**First, convert the moved test file.** `packages/reminders/test/planReminders.test.ts` opens with `mock.module("@/shared/i18n", () => ({ … }))` defining a stub whose functions echo their inputs. That alias cannot resolve inside a package — but the stub object is now exactly the `ReminderCopy` the planner takes as a parameter. So:

- Delete the `mock.module(…)` call and the `mock` import.
- Lift its `m` object into a `const testCopy: ReminderCopy = { … }`, renaming each key from `notif_whenToday` to `whenToday` and so on, and adding `money: (amount, currency) => …` reproducing whatever `formatMoney` stub the file relies on today.
- Pass `testCopy` as the fourth argument at every `planReminders(…)` call site.

**Every existing assertion stays exactly as it is.** All fourteen expected strings — `"Netflix renews tomorrow"`, `"₴100.00"`, `"Netflix, Spotify · ₴500.00"`, `"a, b, c and 2 more · ₴500.00"`, `"trial no amount"`, `"Trials ending tomorrow"`, and the rest — must still pass, unedited. They are the entire regression net for the six `describe` branches. If one needs changing to go green, the port is wrong.

**Then append the new cases below.** The private `occurrenceAfter`/`addUtcMonths` is being replaced by `RecurrenceUtils`; these prove the swap is faithful. Reuse the fixture builder already in the file rather than defining a second one — and note that `billing.original` is `{ currencyCode, monthly }` only, with no `amount` and no `yearly`. Task 6 deleted exactly that drift from three fixtures in `packages/spend/test`; do not reintroduce it here.

```ts
describe("planReminders", () => {
  // A paused subscription must not produce a renewal reminder. The private
  // recurrence engine this replaced checked only `status === "active"`, which
  // happens to be right — this pins it against the shared engine too.
  test("a paused subscription produces nothing", () => {
    const settings = { ...DEFAULT_REMINDER_SETTINGS, renewals: true };
    const now = new Date("2026-08-24T00:00:00.000Z");

    // The control: the same subscription, active, DOES produce reminders.
    // Without this the assertion below passes for the wrong reason.
    expect(planReminders([sub], settings, now, testCopy).length).toBeGreaterThan(0);
    expect(planReminders([{ ...sub, status: "paused" }], settings, now, testCopy)).toHaveLength(0);
  });

  // Jan 31 monthly must clamp to Feb 28 and then return to Mar 31. The private
  // addUtcMonths did this correctly by always measuring from the anchor;
  // RecurrenceUtils must too, or every end-of-month subscription drifts back to
  // the 28th and stays there.
  test("month-end occurrences clamp without drifting", () => {
    const plan = planReminders(
      [{ ...sub, nextPaymentDate: "2027-01-31T00:00:00.000Z" }],
      { ...DEFAULT_REMINDER_SETTINGS, renewals: true, renewalLeadDays: [0] },
      new Date("2027-01-01T00:00:00.000Z"),
      testCopy,
    );
    expect(plan.map((r) => r.fireAt.getDate())).toEqual([31, 28, 31]);
  });

  // Sort THEN trim: the budget must keep the SOONEST reminders, because those
  // are the ones iOS would have kept anyway.
  test("the budget keeps the soonest, not the first computed", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      ...sub,
      id: `s${i}`,
      nextPaymentDate: new Date(Date.UTC(2026, 8, 1 + i)).toISOString(),
    }));
    const plan = planReminders(
      many,
      { ...DEFAULT_REMINDER_SETTINGS, renewals: true, renewalLeadDays: [0] },
      new Date("2026-08-24T00:00:00.000Z"),
      testCopy,
      5,
    );
    expect(plan).toHaveLength(5);
    expect(plan[0]!.fireAt.getTime()).toBeLessThan(plan[4]!.fireAt.getTime());
  });
});
```

**`DEFAULT_REMINDER_SETTINGS` has `renewals: false`.** That is the real shipped default — a fresh install schedules nothing until the user turns reminders on. Every test above therefore spreads `renewals: true` explicitly; without it the planner correctly returns an empty array and the assertions are meaningless. `budget` is the **fifth** parameter now, after `copy`.

- [ ] **Step 3: Run to verify it fails**

Run: `bun test packages/reminders/test`

Expected: FAIL — the moved files still import `@/shared/i18n` and `@/shared/lib/format`, which do not resolve outside the app.

- [ ] **Step 4: Replace the private engine and inject the copy**

In `packages/reminders/src/planReminders.ts`:

- **Delete `addUtcMonths` and `occurrenceAfter`.** Replace their call site in `renewalEvents` with `RecurrenceUtils.addPeriod(DateTimezoneUtils.toCalendarDay(subscription.nextPaymentDate), subscription.every * step, subscription.period)`. Note `occurrenceAfter` measures `every * step` **from the anchor** on every iteration rather than stepping repeatedly — `addPeriod` does the same, and its `anchorDate` defaults to the date passed in, which is the anchor. Confirm `step === 0` still returns the anchor unchanged.
- **Delete `import { m } from "@/shared/i18n"` and `import { formatMoney } from "@/shared/lib/format"`.** Every use of `m.notif_*` inside `describe`, `whenPhrase` and `nameList` becomes a call on the injected `copy`; every `formatMoney(...)` becomes `copy.money(...)`.
- **Thread `copy` through.** `planReminders(subscriptions, settings, now, copy, budget = REMINDER_BUDGET)`, passing it into the `describe(group.kind, group.fireAt, group.events, copy)` call, and from there into `whenPhrase` and `nameList`. Nothing else about `planReminders` changes — not the grouping key, not the same-subscription dedupe, not the sort-then-trim.
- **Keep all six `describe` branches, byte-for-byte in structure.** Single renewal, single trial (with its `amount > 0` fork), digest renewal same-day, digest renewal mixed-day, digest trial same-day, digest trial mixed-day — each with its own `target`. The comment explaining why only a same-day renewal group targets the due screen documents a real bug and must survive.
- **Keep the digest total rule.** Summed only when *every* event has a figure: one unknown price silently understates the rest, and a total that is quietly too low is worse than no total.
- Keep `REMINDER_BUDGET = 56` and its comment about the iOS 64 ceiling. Keep `REMINDER_LOOKAHEAD = 3` and its comment — Plan C changes it, not this task.
- Keep `fireInstant` and `leadDaysOf` exactly as they are, including the comment about the deliberate device-zone divergence. `leadDaysOf` compares a UTC event day against a **local** fire day on purpose.

Create `packages/reminders/src/reminder.ts` holding `ReminderKind`, `ReminderTarget`, `ReminderInput`, `ReminderCopyKey` and `Reminder`.

**`settings.ts` splits; it does not simply move.** The `git mv` in Step 1 brings the whole file across, and then the storage half goes back to the app:

| Stays in `packages/reminders/src/settings.ts` | Returns to `apps/mobile/src/shared/lib/notifications/settings.ts` |
|---|---|
| `LEAD_DAY_CHOICES`, `FREE_LEAD_DAYS` | `SETTINGS_KEY`, `LEGACY_ENABLED_KEY` |
| `ReminderSettings` type (renamed from `NotificationSettings`) | `readNotificationSettings()` |
| `DEFAULT_REMINDER_SETTINGS` (renamed from `DEFAULT_NOTIFICATION_SETTINGS`) | `writeNotificationSettings()` |
| `readInt`, `readLeadDays` — pure sanitisers the app's reader calls | — |
| `toggleLeadDay`, `effectiveSettings` | — |

`deviceJson`/`deviceFlags` cannot be imported from a package, so the two storage functions stay in the app and import the sanitisers from `@subeye/reminders`. Keep `readLeadDays` and `readInt` **exported** from the package for that reason — they are what stop a blob written by an older build from becoming a crash loop, and they are read at render and before every schedule.

The settings screen imports `readNotificationSettings` / `writeNotificationSettings` from `@/shared/lib/notifications`; re-export them from the adapter's barrel so no screen import changes.

- [ ] **Step 5: Run to verify it passes**

Run: `bun test packages/reminders/test`

Then: `TZ=America/Los_Angeles bun test packages/reminders/test`

Expected: both PASS.

- [ ] **Step 6: Write the mobile adapter**

Create `apps/mobile/src/shared/lib/notifications/copy.ts` — the one place `m` is used for reminders now:

```ts
import type { ReminderCopy } from "@subeye/reminders";
import { m } from "@/shared/i18n";
import { formatMoney } from "@/shared/lib/format";

export const reminderCopy: ReminderCopy = {
  whenToday: m.notif_whenToday,
  whenTomorrow: m.notif_whenTomorrow,
  whenInDays: m.notif_whenInDays,
  renewalTitle: m.notif_renewalTitle,
  renewalBody: m.notif_renewalBody,
  renewalBodyNoAmount: m.notif_renewalBodyNoAmount,
  trialTitle: m.notif_trialTitle,
  trialBody: m.notif_trialBody,
  trialBodyNoAmount: m.notif_trialBodyNoAmount,
  renewalDigestTitle: m.notif_renewalDigestTitle,
  renewalDigestTitleMixed: m.notif_renewalDigestTitleMixed,
  trialDigestTitle: m.notif_trialDigestTitle,
  trialDigestTitleMixed: m.notif_trialDigestTitleMixed,
  digestBody: m.notif_digestBody,
  digestMore: m.notif_digestMore,
  money: formatMoney,
};
```

If a paraglide function's generated signature does not structurally satisfy the port member, wrap it in an arrow rather than loosening the port type.

In `apps/mobile/src/shared/lib/notifications/index.ts`:

- Import `planReminders`, `REMINDER_BUDGET`, `effectiveSettings` and the types from `@subeye/reminders`; import `reminderCopy` from `./copy`.
- Pass `reminderCopy` as the fourth argument in `rebuild`: `planReminders(subscriptions, settings, new Date(), reminderCopy, REMINDER_BUDGET + 1)`. The `+ 1` is deliberate — asking for one more than can be scheduled is the only evidence anything was dropped. Keep it.
- Keep `readNotificationSettings` / `writeNotificationSettings` **here**, reading `deviceJson` and `deviceFlags`, and re-export them so the settings screen's imports do not change. They carry the `LEGACY_ENABLED_KEY` upgrade read — an install that already had reminders on must keep them, and migrating by going silent is the one outcome nobody would report as a bug.
- Everything else — `rebuild`, `syncGeneration`, `planTruncated`, `syncBarrier`, `ensureChannels`, `readNotificationHealth`, `sendTestNotification`, `cancelReminders`, `useReminderTap` — is unchanged.

Add `"@subeye/reminders": "workspace:*"` to `apps/mobile/package.json`.

- [ ] **Step 7: Guard the zero-amount renewal body**

`notif_renewalBody` formats an amount unconditionally, so a subscription whose amount could not be converted reads "₴0.00 will be charged." The trial path already handles exactly this via `notif_trialBodyNoAmount` — the renewal path never got the same treatment.

This matters more after Plan B: FX is the one thing that still needs a network, and `CurrencyUtils.convert` deliberately degrades to an unconverted amount rather than throwing. Add the guard now, while the branch is already open.

In `describe()`, mirror the trial fork onto the single-renewal branch:

```ts
body: first.amount > 0
  ? copy.renewalBody({ amount: copy.money(first.amount, first.currency) })
  : copy.renewalBodyNoAmount(),
```

Add `notif_renewalBodyNoAmount` to both `apps/mobile/messages/en.json` and `messages/uk.json` — matching the existing `notif_trialBodyNoAmount` in tone, in both languages — then:

```bash
bun run --cwd apps/mobile i18n:generate
```

Add a stub for it to the test's copy object and one assertion covering the branch.

- [ ] **Step 8: Run all four gates**

```bash
bun install
bun run type-check && bun run test && bun run check:boundaries && bun run check:circular
```

Expected: all green. The mobile suite still has `settle-barrier.test.ts` and `trigger-time.test.ts`, which stay in the app because they test platform adapters.

- [ ] **Step 9: Write `packages/reminders/CLAUDE.md`**

```markdown
# @subeye/reminders — what to remind about, and when

Planning only. No `expo-notifications`, no OS types, no storage, no strings.

## Invariants

- `planReminders` is pure and takes `now`. It returns copy DESCRIPTORS, not
  rendered text: a pure package cannot import paraglide's `m`, which is
  generated into the mobile app. The adapter renders them.
- `REMINDER_BUDGET = 56`. iOS keeps only the 64 soonest pending local
  notifications per app and silently drops the rest — no error, no warning.
  The budget counts reminder MORNINGS, not subscriptions, because reminders at
  the same instant are grouped into one digest.
- Sort THEN trim. The budget must keep the soonest reminders, because those are
  the ones iOS would have kept anyway and the ones the user needs first.
- `fireInstant` builds in the DEVICE's zone, deliberately not the account's.
  "09:00, three days before" is wall-clock, and the reminder should land at
  09:00 where the user physically is.
- A trigger in the past fires immediately on iOS. Skip it rather than nag.
- Recurrence comes from `@subeye/time`. There used to be a second, private
  engine in this file that did not know about pause windows or cancellation
  gating. Do not reintroduce one.

## Runway

`REMINDER_LOOKAHEAD = 3` one-shot occurrences per subscription means the
schedule covers roughly `min(3, 56/N)` months before it silently runs out, where
N is the active subscription count. Plan C replaces the expressible recurrences
with repeating OS triggers to make that indefinite. Until then, this ceiling is
real — do not describe reminders as permanent.
```

- [ ] **Step 10: Commit**

```bash
git add packages apps package.json bun.lock
git commit -m "refactor(reminders): extract reminder planning into @subeye/reminders"
```

---

## Task 8: `packages/store`

The last package and the only impure one. Holds record types, storage **ports**, and the use-cases that orchestrate `read → pure compute → write`. Implementations live in the consuming app: the server injects Drizzle adapters now, mobile injects MMKV adapters in Plan B.

### This task is split into three. Do not attempt it in one sitting.

Measured on 2026-08-24 at `b7b417f`: `apps/server/src/domains` is 2,739 LOC and `apps/server/test` is 1,907 LOC across 18 files. Task 8 as originally written moves or rewrites most of both in a single commit — roughly 3,000 changed lines, unreviewable and unbisectable. Split it:

| Slice | Scope | Ends green |
|---|---|---|
| **8a — Foundation** | Scaffold, `records.ts`, `ports.ts`, `errors.ts`, `toSubscriptionDto`, the in-memory harness, and a **parity test** against the server's live mapper. Nothing consumes the package yet. | Dead code in the bundle; server untouched and behaving identically |
| **8b — Subscription and phase use-cases** | The lifecycle and phase mutations, their 8 tests, and rewiring `SubscriptionService` + `SubscriptionPhaseService`. The money half. | Server delegates; all lifecycle/phase tests green |
| **8c — Category, preferences, analytics** | The remaining use-cases, their 4 tests, and rewiring `CategoryService`, `UserService`, `AnalyticsService`. Deletes the duplicated mapper in the phase service. | Server fully delegating; `apps/server/src/domains` is adapters only |

One commit per slice. Each ends with all four gates green and a dev smoke test.

### The parity test — write it in 8a, delete it in Plan B

While both implementations exist, the strongest possible proof that `toSubscriptionDto` is faithful is to run the same inputs through the server's live `SubscriptionService.mapToDto` and assert deep equality. That window closes the moment 8c deletes the old one, so take it:

```ts
// apps/server/test/dto-parity.test.ts — temporary, lives only until Plan B
test("toSubscriptionDto matches the live mapper", () => {
  const now = new Date("2026-08-24T00:00:00.000Z");
  expect(toSubscriptionDto(record, phases, preferences, rates, category, now))
    .toEqual(SubscriptionService.mapToDto(record, preferences, rates, phases, category));
});
```

Cover at minimum: a plain active subscription, one `cancelling`, one `paused`, one with a pending phase, one with an active trial, and one whose currency has no rate. If any pair diverges, the port is wrong — do not adjust the expectation.

Note the old mapper reads the clock internally, so pin it (`setSystemTime`) for the comparison, or accept that the two `status` fields are computed microseconds apart and compare everything else.

### Two corrections to what follows

**`toSubscriptionDto` needs `category` and `now`.** The real chain is `SubscriptionService.mapToDto` → `SubscriptionMapper.toDto`, and between them they take an `EmbeddedCategory | null` (the DTO embeds the category so the client renders a chip without a second request) and read the clock **twice** — `SubscriptionMapper.toDto` calls `deriveSubscriptionStatus(..., new Date(), tz)`, and `calculatePaymentDates` defaults `relativeTo` to `DateTimezoneUtils.now(tz)`. Both must become the injected `now`. The signature in the Interfaces block below is corrected accordingly.

**Keep the `status` field on the error classes.** An earlier draft said to strip it. Do not: every class in `subscriptionErrors.ts` carries `readonly status = 404 as const` or `400`, the route layer reads it, and `service-error-codes.test.ts` pins the resulting envelope. Removing it means inventing a code→status map in the routes and rewriting that test, inside the largest task in the plan, for a purity gain worth nothing — the server is deleted in Plan B and the field becomes vestigial then, at zero cost. Leave it.

**Files:**
- Create: `packages/store/package.json`, `tsconfig.json`, `CLAUDE.md`
- Create: `packages/store/src/records.ts`, `src/ports.ts`, `src/subscriptionUseCases.ts`, `src/phaseUseCases.ts`, `src/categoryUseCases.ts`, `src/preferencesUseCases.ts`, `src/analytics.ts`, `src/errors.ts`, `src/index.ts`
- Create: `packages/store/test/inMemoryPorts.ts`
- Move: 12 server tests (listed in Step 6)
- Modify: `apps/server/src/domains/**` — services become adapters
- Move: `apps/server/src/domains/subscription/subscriptionErrors.ts` → `packages/store/src/errors.ts`

**Interfaces:**
- Consumes: all seven packages.
- Produces:
  ```ts
  export type SubscriptionRecord = {
    id: string; name: string; cost: string; currency: string;
    every: number; period: SubscriptionPeriod; status: SubscriptionStatus;
    autoPaid: boolean; categoryId: string | null; notes: string | null;
    brandDomain: string | null; paymentDate: string;
    willBeCancelledAt: string | null; pausedAt: string | null; resumeAt: string | null;
    createdAt: string; updatedAt: string;
  };
  export type CategoryRecord = { id: string; name: string; emoji: string; createdAt: string; updatedAt: string };
  export type PricePhaseRecord = {
    id: string; subscriptionId: string; kind: PricePhaseKind;
    cost: string; currency: string; startsAt: string;
    endsAt: string | null; appliedAt: string | null;
    createdAt: string; updatedAt: string;
  };
  export type PreferencesRecord = UserPreferences;

  export type SubscriptionPort = {
    all(): Promise<SubscriptionRecord[]>;
    byId(id: string): Promise<SubscriptionRecord | null>;
    create(record: SubscriptionRecord): Promise<SubscriptionRecord>;
    update(id: string, patch: Partial<SubscriptionRecord>): Promise<SubscriptionRecord>;
    remove(id: string): Promise<void>;
  };
  export type CategoryPort = {
    all(): Promise<CategoryRecord[]>;
    byId(id: string): Promise<CategoryRecord | null>;
    create(record: CategoryRecord): Promise<CategoryRecord>;
    update(id: string, patch: Partial<CategoryRecord>): Promise<CategoryRecord>;
    remove(id: string): Promise<void>;
  };
  export type PricePhasePort = {
    bySubscription(subscriptionId: string): Promise<PricePhaseRecord[]>;
    replaceAll(subscriptionId: string, records: PricePhaseRecord[]): Promise<void>;
    applyBoundary(args: {
      subscriptionId: string; phaseId: string; precedingPhaseId: string | null;
      cost: string; currency: string; appliedAt: string; startsAt: string;
    }): Promise<void>;
    remove(id: string): Promise<void>;
  };
  export type PreferencesPort = {
    read(): Promise<PreferencesRecord>;
    write(patch: Partial<PreferencesRecord>): Promise<PreferencesRecord>;
  };
  export type RatesPort = { forBase(code: string): Promise<RateTable> };

  export type Ports = {
    subscriptions: SubscriptionPort; categories: CategoryPort;
    phases: PricePhasePort; preferences: PreferencesPort; rates: RatesPort;
    now: () => Date; newId: () => string;
  };

  // use-cases — every one takes Ports first
  export const listSubscriptions: (p: Ports) => Promise<SubscriptionDto[]>;
  export const getSubscription: (p: Ports, id: string) => Promise<SubscriptionDto>;
  export const addSubscription: (p: Ports, input: AddSubscriptionInput) => Promise<SubscriptionDto>;
  export const updateSubscription: (p: Ports, id: string, input: UpdateSubscriptionInput) => Promise<SubscriptionDto>;
  export const deleteSubscription: (p: Ports, id: string) => Promise<void>;
  export const cancelSubscription: (p: Ports, id: string, mode: "periodEnd" | "immediate") => Promise<SubscriptionDto>;
  export const renewSubscription: (p: Ports, id: string, paymentDate: string | null) => Promise<SubscriptionDto>;
  export const pauseSubscription: (p: Ports, id: string, resumeAt: string | null) => Promise<SubscriptionDto>;
  export const resumeSubscription: (p: Ports, id: string) => Promise<SubscriptionDto>;
  export const startPhase: (p: Ports, id: string, input: StartPhaseInput) => Promise<SubscriptionDto>;
  export const cancelPhase: (p: Ports, id: string, phaseId: string) => Promise<SubscriptionDto>;
  export const applyPhaseNow: (p: Ports, id: string, phaseId: string) => Promise<SubscriptionDto>;
  export const applyDuePhases: (p: Ports, id: string) => Promise<void>;
  export type EmbeddedCategory = { id: string; name: string; emoji: string };
  export const toSubscriptionDto: (
    record: SubscriptionRecord,
    phases: PricePhaseRecord[],
    prefs: PreferencesRecord,
    rates: RateTable,
    category: EmbeddedCategory | null,
    now: Date,
  ) => SubscriptionDto;
  export const listCategories: (p: Ports) => Promise<CategoryDto[]>;
  export const createCategory: (p: Ports, input: { name: string; emoji: string }) => Promise<CategoryDto>;
  export const updateCategory: (p: Ports, id: string, input: { name?: string; emoji?: string }) => Promise<CategoryDto>;
  export const deleteCategory: (p: Ports, id: string) => Promise<void>;
  export const readPreferences: (p: Ports) => Promise<PreferencesRecord>;
  export const writePreferences: (p: Ports, patch: Partial<PreferencesRecord>) => Promise<PreferencesRecord>;
  export const buildDashboard: (p: Ports) => Promise<DashboardAnalyticsDto>;
  export const buildMonthlySummary: (p: Ports) => Promise<MonthlySpendSummaryDto>;
  ```

**Naming note:** `store` owns ports *and* use-cases. The name is the layer, not just persistence.

- [ ] **Step 1: Scaffold**

Create `packages/store/package.json`:

```json
{
  "name": "@subeye/store",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "dependencies": {
    "@subeye/lifecycle": "workspace:*",
    "@subeye/model": "workspace:*",
    "@subeye/money": "workspace:*",
    "@subeye/pricing": "workspace:*",
    "@subeye/spend": "workspace:*",
    "@subeye/time": "workspace:*"
  },
  "scripts": {
    "lint": "biome check .",
    "test": "bun test ./test",
    "type-check": "tsc --noEmit --pretty"
  }
}
```

Copy `packages/spend/tsconfig.json` to `packages/store/tsconfig.json` verbatim.

```bash
cd /Users/yehor/Developer/projects/sub-eye
git mv apps/server/src/domains/subscription/subscriptionErrors.ts packages/store/src/errors.ts
```

In `errors.ts`, delete the HTTP `status` field from every class — the route layer maps a domain error to a status, not the other way round.

- [ ] **Step 2: Write `records.ts` and `ports.ts`**

Both are the interface blocks above, verbatim, with no implementation. `records.ts` mirrors `apps/server/src/db/schema.ts` minus every `userId` column — the store is single-tenant by construction, and the server adapter supplies the tenant.

- [ ] **Step 3: Write the in-memory port harness**

Create `packages/store/test/inMemoryPorts.ts`:

```ts
import type {
  CategoryRecord, Ports, PreferencesRecord, PricePhaseRecord, SubscriptionRecord,
} from "../src";

/**
 * A full Ports implementation over plain arrays. Every use-case test drives
 * this instead of a hand-rolled per-test fake, so a use-case that forgets to
 * write is caught by reading back rather than by asserting a spy was called.
 */
export function inMemoryPorts(seed?: {
  subscriptions?: SubscriptionRecord[];
  categories?: CategoryRecord[];
  phases?: PricePhaseRecord[];
  preferences?: Partial<PreferencesRecord>;
  rates?: Record<string, number>;
  now?: Date;
}): Ports & { dump: () => { subscriptions: SubscriptionRecord[]; categories: CategoryRecord[]; phases: PricePhaseRecord[] } } {
  const subscriptions = [...(seed?.subscriptions ?? [])];
  const categories = [...(seed?.categories ?? [])];
  const phases = [...(seed?.phases ?? [])];
  let preferences: PreferencesRecord = {
    preferredCurrency: "uah",
    preferredTimezone: "UTC",
    dateFormat: "DD/MM/YYYY",
    locale: "en",
    theme: "system",
    ...seed?.preferences,
  };
  let idCounter = 0;

  return {
    now: () => seed?.now ?? new Date("2026-08-24T00:00:00.000Z"),
    newId: () => `id-${++idCounter}`,
    rates: { forBase: async () => seed?.rates ?? {} },
    preferences: {
      read: async () => preferences,
      write: async (patch) => { preferences = { ...preferences, ...patch }; return preferences; },
    },
    subscriptions: {
      all: async () => [...subscriptions],
      byId: async (id) => subscriptions.find((s) => s.id === id) ?? null,
      create: async (record) => { subscriptions.push(record); return record; },
      update: async (id, patch) => {
        const index = subscriptions.findIndex((s) => s.id === id);
        if (index === -1) throw new Error(`no subscription ${id}`);
        const next = { ...subscriptions[index]!, ...patch };
        subscriptions[index] = next;
        return next;
      },
      remove: async (id) => {
        const index = subscriptions.findIndex((s) => s.id === id);
        if (index !== -1) subscriptions.splice(index, 1);
        // Cascade, which Postgres did with ON DELETE CASCADE.
        for (let i = phases.length - 1; i >= 0; i--) {
          if (phases[i]!.subscriptionId === id) phases.splice(i, 1);
        }
      },
    },
    categories: {
      all: async () => [...categories],
      byId: async (id) => categories.find((c) => c.id === id) ?? null,
      create: async (record) => { categories.push(record); return record; },
      update: async (id, patch) => {
        const index = categories.findIndex((c) => c.id === id);
        if (index === -1) throw new Error(`no category ${id}`);
        const next = { ...categories[index]!, ...patch };
        categories[index] = next;
        return next;
      },
      remove: async (id) => {
        const index = categories.findIndex((c) => c.id === id);
        if (index !== -1) categories.splice(index, 1);
        // ON DELETE SET NULL.
        for (const s of subscriptions) if (s.categoryId === id) s.categoryId = null;
      },
    },
    phases: {
      bySubscription: async (subscriptionId) =>
        phases.filter((p) => p.subscriptionId === subscriptionId),
      replaceAll: async (subscriptionId, records) => {
        for (let i = phases.length - 1; i >= 0; i--) {
          if (phases[i]!.subscriptionId === subscriptionId) phases.splice(i, 1);
        }
        phases.push(...records);
      },
      applyBoundary: async (args) => {
        const phase = phases.find((p) => p.id === args.phaseId);
        if (phase) { phase.appliedAt = args.appliedAt; phase.startsAt = args.startsAt; }
        if (args.precedingPhaseId) {
          const preceding = phases.find((p) => p.id === args.precedingPhaseId);
          if (preceding) preceding.endsAt = args.startsAt;
        }
        const subscription = subscriptions.find((s) => s.id === args.subscriptionId);
        if (subscription) { subscription.cost = args.cost; subscription.currency = args.currency; }
      },
      remove: async (id) => {
        const index = phases.findIndex((p) => p.id === id);
        if (index !== -1) phases.splice(index, 1);
      },
    },
    dump: () => ({ subscriptions: [...subscriptions], categories: [...categories], phases: [...phases] }),
  };
}
```

- [ ] **Step 4: Write the failing use-case test**

Create `packages/store/test/subscriptionUseCases.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { SubscriptionPeriod } from "@subeye/model";
import { cancelSubscription, pauseSubscription } from "../src";
import { inMemoryPorts } from "./inMemoryPorts";

const record = {
  id: "s1", name: "Netflix", cost: "15.00", currency: "usd",
  every: 1, period: SubscriptionPeriod.MONTH, status: "active" as const,
  autoPaid: false, categoryId: null, notes: null, brandDomain: null,
  paymentDate: "2026-09-15T00:00:00.000Z",
  willBeCancelledAt: null, pausedAt: null, resumeAt: null,
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("cancelSubscription", () => {
  // Cancelling must NOT delete pending phases. A user who cancels and then
  // renews expects the scheduled price change to still be there.
  test("preserves pending phases", async () => {
    const ports = inMemoryPorts({
      subscriptions: [record],
      phases: [{
        id: "p1", subscriptionId: "s1", kind: "scheduledChange",
        cost: "18.00", currency: "usd", startsAt: "2026-10-15T00:00:00.000Z",
        endsAt: null, appliedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
      }],
    });

    await cancelSubscription(ports, "s1", "periodEnd");

    expect(ports.dump().phases).toHaveLength(1);
    expect(ports.dump().subscriptions[0]!.status).toBe("cancelling");
  });
});

describe("pauseSubscription", () => {
  // The status COLUMN must be written, not just the date columns — SQL-side
  // filtering reads the column, and a stale one hides the subscription.
  test("writes the derived status column", async () => {
    const ports = inMemoryPorts({ subscriptions: [record] });

    await pauseSubscription(ports, "s1", null);

    expect(ports.dump().subscriptions[0]!.status).toBe("paused");
  });

  test("throws a domain error when the subscription is not active", async () => {
    const ports = inMemoryPorts({
      subscriptions: [{ ...record, status: "cancelled", willBeCancelledAt: "2026-08-01T00:00:00.000Z" }],
    });

    await expect(pauseSubscription(ports, "s1", null)).rejects.toThrow();
  });
});
```

- [ ] **Step 5: Run to verify it fails**

Run: `bun test packages/store/test`

Expected: FAIL — `Export named 'cancelSubscription' not found in module`.

- [ ] **Step 6: Write the use-cases**

Port the orchestration from `apps/server/src/domains/`, dropping every ownership check (`existing.userId !== userId`, `assertCategoryBelongsToUser`, `findManyByIds(...).filter(...)`) — the store is single-tenant. Each mutation is: `byId` → `lifecycle`/`pricing` pure call → `null` becomes a throw from `errors.ts` → `update` with the patch plus the recomputed `status`.

`toSubscriptionDto` is the port of `SubscriptionService.mapToDto` (804-line file, lines 608–641) plus `SubscriptionMapper.toDto` — it calls `SubscriptionCalculator.calculateBillingDetails`, `SubscriptionCalculator.calculatePaymentDates`, `buildPhaseProjection`, `deriveSubscriptionStatus` and `getAllowedActions`. There is a second, duplicated copy in `subscriptionPhaseService.ts` (`mapToDto` + `reloadDto` + `getPreferencesAndRates`, ~120 lines); delete it rather than porting it.

`analytics.ts` ports `AnalyticsService.getDashboardStats` and `getMonthlySpendSummary`. Preserve the composition exactly — it is the part the calculators cannot enforce:
- `analyticsEligibleSubscriptions` = filtered by `AnalyticsCalculator.hasUpcomingOccurrence(sub, today)`.
- `currentlyActiveSubscriptions` = that, filtered again by `isCurrentlyActiveSubscription(sub.status)`. **All six dashboard metrics read this second list.**
- `yearlyForecast` = `sumSpendInRange(list, today, today + 12 months)`, **not** `monthlyBurnRate × 12`.
- `upcomingRenewals` = `nextOccurrenceRenewals(...).slice(0, 5)`.
- Monthly trend offsets are `[-1, 0, 1, 2, 3, 4, 5, 6]`.

**Do not port** `getWeeklyRenewalsSummary`, `bulkDeleteSubscriptions`, `bulkUpdateCategory`, `deleteAllForUser`, `countByUserId` or `deleteByIds` — all six are dead, with zero mobile callers.

- [ ] **Step 7: Run to verify it passes**

Run: `bun test packages/store/test`

Expected: PASS.

- [ ] **Step 8: Move the remaining server service tests**

```bash
cd /Users/yehor/Developer/projects/sub-eye
git mv apps/server/test/add-subscription-validates-before-write.test.ts packages/store/test/addSubscription.test.ts
git mv apps/server/test/cancel-preserves-pending-phases.test.ts packages/store/test/cancelPreservesPhases.test.ts
git mv apps/server/test/renew-reanchors-payment-date.test.ts packages/store/test/renew.test.ts
git mv apps/server/test/pause-resume-service.test.ts packages/store/test/pauseResume.test.ts
git mv apps/server/test/lifecycle-writes-status-column.test.ts packages/store/test/statusColumn.test.ts
git mv apps/server/test/phase-apply-now-closes-timeline.test.ts packages/store/test/phaseApplyNow.test.ts
git mv apps/server/test/subscription-phase-service.test.ts packages/store/test/phaseUseCases.test.ts
git mv apps/server/test/category-service.test.ts packages/store/test/categoryUseCases.test.ts
git mv apps/server/test/user-service.test.ts packages/store/test/preferences.test.ts
git mv apps/server/test/dashboard-metric-agreement.test.ts packages/store/test/dashboardAgreement.test.ts
git mv apps/server/test/subscription-category-ownership.test.ts packages/store/test/categoryExists.test.ts
```

Rewrite each to drive `inMemoryPorts()` instead of its hand-rolled `deps as never` fakes. `categoryExists.test.ts` loses its ownership assertions and keeps only "the category must exist".

**Port `read-path-does-not-write.test.ts`, do not delete it.** An earlier draft said to drop it on the grounds that "with reads and writes in one store the invariant is meaningless". That is wrong. The invariant is not "a GET must not mutate" — it is **the list read must not apply due phases; only the single read may**. That is a deliberate product decision (a boundary fires when you open *that* subscription), it survives intact into the offline world, and the in-memory harness makes it cheaper to assert than it was before:

```ts
test("listing does not settle due phases", async () => {
  const ports = inMemoryPorts({ subscriptions: [record], phases: [duePhase] });
  const before = JSON.stringify(ports.dump());
  await listSubscriptions(ports);
  expect(JSON.stringify(ports.dump())).toBe(before);
});
```

Rename it `packages/store/test/listDoesNotWrite.test.ts` and keep the paired assertion that `getSubscription` *does* settle them — a test that only proves the negative passes just as well against a `listSubscriptions` that returns nothing.

Delete outright — these two test things that genuinely stop existing:

```bash
git rm apps/server/test/subscription-list-sql-filters.test.ts
git rm apps/server/test/status-backfill-parity.test.ts
```

`subscription-list-sql-filters` is half SQL pushdown (gone — the client already filters in memory, with tests in `apps/mobile/src/entities/subscription/model/filters.test.ts`) and half `SubscriptionDto` shape (already covered by `toSubscriptionDto.test.ts` from slice 8a). `status-backfill-parity` is a live-Neon one-off that already declares itself HISTORICAL.

**Delete `apps/server/test/dto-parity.test.ts` in slice 8b, in the same commit that makes `SubscriptionService.mapToDto` delegate to `toSubscriptionDto`.** At that moment it compares a function to itself and can no longer fail. Its job was to validate the port while two independent implementations existed; that window closes on delegation, and a test that cannot fail is worse than no test because it reads as coverage. Say so in the commit body.

- [ ] **Step 9: Rewrite the server services as adapters**

Each of `SubscriptionService`, `SubscriptionPhaseService`, `CategoryService`, `UserService` and `AnalyticsService` becomes a thin object that builds `Ports` from the existing Drizzle repositories (adding the `userId` filter each port needs) and delegates. `subscriptionRepository.findPageByUserId` stays as-is for now — the route still paginates. Delete `subscriptionMapper.ts` and the duplicated `mapToDto` in the phase service.

Add `"@subeye/store": "workspace:*"` to `apps/server/package.json`.

- [ ] **Step 10: Run all four gates**

```bash
bun install
bun run type-check && bun run test && bun run check:boundaries && bun run check:circular
```

Expected: all green.

- [ ] **Step 11: Smoke-test the live server**

Run: `bun run dev:server`

Then exercise each mutation once against the dev branch: create, edit, pause, resume, cancel (both modes), renew, start a trial phase, apply it now, cancel a phase, delete. Confirm the dashboard numbers are unchanged from before the task.

- [ ] **Step 12: Write `packages/store/CLAUDE.md`**

```markdown
# @subeye/store — ports and use-cases

The only package that touches IO, and only through injected ports. It must never
import a database driver, `fetch`, or a platform API.

## Shape

Every use-case is `(ports, ...args)`. Every mutation is the same three steps:
read the record, call a pure function from `lifecycle`/`pricing`, write the
patch. A pure function returning `null` becomes a throw from `errors.ts` here —
that conversion is this package's job and nowhere else's.

## Invariants

- **Single tenant.** There is no `userId` on any record. A multi-tenant host
  (the server) supplies the tenant in its port implementation.
- **`appliedAt` is the idempotency anchor.** `applyPhaseByWorkflow` and
  `applyBoundary` are no-ops once it is set. Never apply a phase without
  checking it, and never clear it.
- **Phases apply lazily, on read.** There is no scheduler. `applyDuePhases` runs
  from `getSubscription`. A boundary therefore fires the next time that
  subscription is opened, not at the instant it comes due. That is intended.
- **`applyPhaseNow` must close the timeline it moves.** Stamping `appliedAt` and
  copying the price is not enough — it must also close the preceding phase's
  `endsAt` and pull the applied phase's `startsAt` back to now if it was in the
  future. `test/phaseApplyNow.test.ts` is the regression.
- **The status column is written on every lifecycle mutation**, derived from the
  date columns. A stale column hides a subscription from every filter.
- **Which list feeds which metric is load-bearing.** See the comment in
  `analytics.ts`. `yearlyForecast` is a range sum, not `burnRate × 12` — a
  cancelling subscription keeps a full run-rate but contributes fewer charges.
- Tests drive `test/inMemoryPorts.ts`, never a per-test fake. Reading state back
  catches a use-case that forgot to write; a spy does not.
```

- [ ] **Step 13: Commit**

```bash
git add packages apps package.json bun.lock
git commit -m "refactor(store): extract ports and use-cases into @subeye/store"
```

---

## Task 9: enforce the new boundaries

**Files:**
- Modify: `dependency-cruiser.cjs`
- Modify: `package.json` (the `check:circular` chain)
- Modify: `CLAUDE.md` (root)

**Interfaces:**
- Consumes: the eight packages as built.
- Produces: a build that fails on a wrong-direction package import.

- [ ] **Step 1: Add the package-layer rule**

In `dependency-cruiser.cjs`, insert after `no-package-to-app`:

```js
{
  name: "package-layering",
  comment:
    "Package layering: time/money/model are leaves; lifecycle/pricing/spend/reminders derive from them; store sits on top and is the only package allowed IO (through injected ports). An edge in the other direction means the concern is in the wrong package.",
  severity: "error",
  from: { path: "^packages/(time|money|model)/" },
  to: { path: "^packages/(lifecycle|pricing|spend|reminders|store)/" },
},
{
  name: "no-derived-to-store",
  comment:
    "Pure derivation packages must not depend on @subeye/store. store composes them, never the reverse.",
  severity: "error",
  from: { path: "^packages/(lifecycle|pricing|spend|reminders)/" },
  to: { path: "^packages/store/" },
},
{
  name: "no-pricing-to-spend",
  comment:
    "pricing must not import spend. The edge existed only because phaseScheduling reached for calculatePaymentDates; that is recurrence and lives in @subeye/time.",
  severity: "error",
  from: { path: "^packages/pricing/" },
  to: { path: "^packages/spend/" },
},
{
  name: "no-spend-to-pricing",
  comment:
    "spend must not import pricing. They are siblings: store composes both, neither composes the other.",
  severity: "error",
  from: { path: "^packages/spend/" },
  to: { path: "^packages/pricing/" },
},
```

**Two plain rules, not one clever one.** dependency-cruiser does support `$1` backreferences from a `from.path` capture into `to.pathNot`, so a single symmetrical rule is expressible — but it is the kind of line that is read wrong at 3am, and there are exactly two edges to forbid.

**There is no dependency-cruiser rule for "store must not import a database driver."** Do not write one. Verified empirically on 2026-08-24: this config sets `exclude: { path: "(^node_modules)…" }`, which removes every npm module from the graph, so a rule matching `drizzle-orm` or `expo-sqlite` sees nothing and can never fire. A rule that cannot fire is worse than no rule, because it reads as enforcement. Enforce it with a test that runs in CI instead — `packages/store/test/noDrivers.test.ts`:

```ts
import { expect, test } from "bun:test";
import pkg from "../package.json";

// @subeye/store reaches storage only through its injected ports. A driver here
// would couple every consumer to one runtime — the server to Postgres, or the
// app to SQLite — which is the whole thing the ports exist to prevent.
const DRIVERS = ["drizzle-orm", "@neondatabase/serverless", "react-native-mmkv", "expo-sqlite"];

test("declares no storage driver", () => {
  const declared = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  expect(declared.filter((name) => DRIVERS.includes(name))).toEqual([]);
});
```

Update the file's header comment from "Encodes four invariants" to list the package-layering one as invariant 5.

- [ ] **Step 2: Extend the circular check**

Earlier tasks already rewrote this line as they created packages, but `store` was added after it was last touched. Confirmed on 2026-08-24: `packages/store/src` is missing. The line must end as:

```json
"check:circular:packages": "madge --circular --extensions ts packages/lifecycle/src packages/model/src packages/money/src packages/pricing/src packages/reminders/src packages/spend/src packages/store/src packages/time/src",
```

Eight paths. Count them — a package silently absent from this list is a package whose cycles nothing checks, which is exactly how `check:circular` becomes decorative.

- [ ] **Step 3: Prove every new rule actually fires**

A rule that has never failed is a rule that may not be wired up — and one of the rules originally drafted for this task turned out to be unfirable. Probe each one, one at a time, reverting between:

| Probe | Temporary edit | Must fail with |
|---|---|---|
| 1 | `import { listSubscriptions } from "@subeye/store";` at the top of `packages/time/src/index.ts` | `package-layering` |
| 2 | `import { listSubscriptions } from "@subeye/store";` at the top of `packages/spend/src/index.ts` | `no-derived-to-store` |
| 3 | `import { SubscriptionCalculator } from "@subeye/spend";` at the top of `packages/pricing/src/index.ts` | `no-pricing-to-spend` |
| 4 | `import { getEffectivePhase } from "@subeye/pricing";` at the top of `packages/spend/src/index.ts` | `no-spend-to-pricing` |

After each: `bun run check:boundaries` must FAIL naming that rule. Then `git checkout` the file and confirm it passes again.

If a probe passes when it should fail, the rule is not matching — fix the rule, not the probe. `dependency-cruiser` matches these against the alias/specifier string, because the root `tsconfig.json` declares no `paths`, so `@subeye/…` specifiers stay unresolved and the raw specifier is kept in `resolved`.

Then prove the driver test fires too: temporarily add `"expo-sqlite": "1.0.0"` to `packages/store/package.json` dependencies and run `bun test packages/store/test/noDrivers.test.ts`. Expected FAIL. Revert.

- [ ] **Step 4: Update the root CLAUDE.md**

Replace the workspace block with the eight packages and their one-line responsibilities, and update the "Boundaries are enforced, not suggested" paragraph to name the new rules. Delete the `packages/currency` line — the package is gone.

- [ ] **Step 5: Run all four gates**

```bash
bun run type-check && bun run test && bun run check:boundaries && bun run check:circular
```

Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add dependency-cruiser.cjs package.json CLAUDE.md
git commit -m "chore(boundaries): enforce package layering and extend the circular check"
```

---

## Task 10: thin the mobile app

The app should now hold routes, page composition, thin data hooks, and adapters — nothing else.

**Files:**
- Modify: `apps/mobile/src/entities/subscription/model/lifecycle-actions.ts`
- Modify: `apps/mobile/src/widgets/subscription-detail/model/cycle.ts`, `model/cancellation.ts`
- Modify: `apps/mobile/CLAUDE.md`
- Audit: `apps/mobile/src/shared/lib/**`

**Interfaces:**
- Consumes: `@subeye/model`, `@subeye/lifecycle`, `@subeye/reminders`, `@subeye/time`, `@subeye/money`.
- Produces: no new exports. This task removes duplication.

- [ ] **Step 1: Find domain logic still living in the app**

```bash
cd /Users/yehor/Developer/projects/sub-eye
grep -rn "Date.UTC\|addMonths\|setUTCDate\|getUTCMonth\|toFixed(2)" apps/mobile/src --include=*.ts --include=*.tsx | grep -v ".test.ts"
```

For each hit, decide between three buckets:

- **Presentation — stays.** `shared/lib/format/*`, `shared/ui/*`. Formatting a date is not deriving one.
- **View-shaping over data the DTO already carries — stays.** `entities/subscription/model/{filters,grouping,attention,timeline-rows}.ts`. These sort, group and label rows the server already computed; they decide nothing about money or recurrence.
- **A domain rule — moves.** Anything that projects an occurrence, derives a status, or computes an amount.

**Expect to find very little, and be willing to conclude nothing moves.** Two files an earlier draft of this plan named as movers were checked on 2026-08-24 and are both correctly placed:

- `widgets/subscription-detail/model/cycle.ts` does no date arithmetic at all — its only `@subeye` import is the `SubscriptionDto` type. It reads `nextPaymentDate` / `lastPaymentDate`, which the DTO already carries. Leave it.
- `widgets/subscription-detail/model/cancellation.ts` `Date.parse`s two DTO fields and compares them to answer "is there one more charge before the cancellation lands". That is **not** the question `getSubscriptionLifecycleStatus` answers (active / cancelledButActive / cancelled), so repointing it there would change the meaning. Its own comment says it answers from the dates rather than the status, deliberately. Leave it.

If the grep turns up nothing that genuinely moves, that is a successful outcome for this step, not a failed one — it means Tasks 1–8 already drained the app. Record what you checked and why each stayed, then move to Step 2.

- [ ] **Step 2: Verify the FSD layers still hold**

Run: `bun run check:boundaries`

Expected: PASS. `mobile-fsd-no-shared-upward` in particular: `shared/lib/notifications/index.ts` must not import `@/entities/pro`. It takes settings already gated through `effectiveSettings`, and that stays true.

- [ ] **Step 3: Run the mobile suite**

Run: `bun test apps/mobile/src`

Expected: PASS. `plan.test.ts` and `settings.test.ts` are gone (moved in Task 7); `settle-barrier.test.ts` and `trigger-time.test.ts` remain.

- [ ] **Step 4: Run the app on a device**

Run: `bun run --cwd apps/mobile ios`

Exercise: cold start shows numbers without a spinner; list filters and sorts; open a subscription; pause and resume it; cancel and renew it; add a subscription; Settings → Notifications shows a non-zero scheduled count; send a test notification and confirm it arrives.

- [ ] **Step 5: Update `apps/mobile/CLAUDE.md`**

In the "Reminders (local notifications)" section, state that planning lives in `@subeye/reminders` and this app owns only the expo adapter, the copy rendering and the MMKV settings. In "Layers & structure", add that domain rules belong in `packages/*` and the app holds routes, composition, data hooks and adapters. Delete any passage describing `plan.ts` internals — that file is in a package now.

Also correct the stale claim in the Transport section that `getToken()` is offline-cached by Clerk: it is not, for this configuration. The cache is in-memory and roughly 60 seconds wide, because `ClerkProvider` is constructed without `__experimental_resourceCache`. The same wrong claim sits in a comment at `apps/mobile/src/shared/auth/token-bridge.ts:7-8` — fix both.

- [ ] **Step 6: Run all four gates**

```bash
bun run type-check && bun run test && bun run check:boundaries && bun run check:circular
```

Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile
git commit -m "refactor(mobile): route domain rules through packages and thin the app layer"
```

---

## Task 11: verify the split end to end

No new code. This is the gate that says Plan A is done.

- [ ] **Step 1: Full gate run from clean**

```bash
cd /Users/yehor/Developer/projects/sub-eye
rm -rf node_modules .turbo
bun install
bun run type-check && bun run test && bun run lint && bun run check:boundaries && bun run check:circular
```

Expected: all five green.

- [ ] **Step 2: Run the whole suite under a non-UTC host zone**

```bash
TZ=America/Los_Angeles bun run test
TZ=Pacific/Auckland bun run test
```

Expected: identical results to the UTC run. A difference means a date path escaped `@subeye/time`.

- [ ] **Step 3: Confirm the dependency graph is what the plan says**

```bash
bunx depcruise --config dependency-cruiser.cjs --output-type dot packages > /tmp/packages.dot
grep -c '\->' /tmp/packages.dot
```

Read the edges and check them against the graph table at the top of this plan. Any edge not in that table is either a mistake or a table that needs updating — decide which, do not ignore it.

- [ ] **Step 4: Deploy to dev and smoke-test**

```bash
bun run deploy:dev
```

Exercise every mutation once against the dev worker and confirm the dashboard numbers match what they were before Task 1.

- [ ] **Step 5: Commit any fixes and tag the milestone**

```bash
git add -A
git commit -m "chore: verify eight-package split end to end"
```

---

## Self-review notes

**Spec coverage.** Eight packages, each with a task: `time` (1), `money` (2), `model` (3), `lifecycle` (4), `pricing` (5), `spend` (6), `reminders` (7), `store` (8). Mobile thinning is Task 10. Boundary enforcement is Task 9. The Hermes risk is Task 0 and gates the rest.

**Deliberately out of scope, and why.** The MMKV adapter, the seed migration, deleting transport/auth and deleting `apps/server` are Plan B — the server must keep working through Plan A so each task stays shippable. Repeating OS triggers are Plan C — they change `planReminders`' output shape and would confound the extraction diff.

**Known deviation from the FSD skill's default.** The skill's minimal layering is `app + pages + shared`, and it advises against a `widgets` layer without confirmed multi-page reuse. This repo instead uses `app` (expo-router routes only) + `widgets/*-page` (page composition) + `entities` + `shared`, with `features` forbidden by `mobile-no-features-layer`. That is a deliberate adaptation: expo-router owns the `src/app` directory name, so FSD's `pages` role moves to `widgets/*-page`. Do not "fix" this by adding a `pages` layer — the router would try to serve it.
