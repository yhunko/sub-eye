# B3 — client crash reporting with Sentry

Supersedes the B3 stub in [SESSION-BRIEFS.md](SESSION-BRIEFS.md), which left the
SDK choice open and described a `.mcp.json` Sentry entry that is not there (the
Sentry MCP is configured globally, not in this repo).

**Do this before the first EAS build.** It adds a native module, so it needs a
prebuild. Landing it after a build means paying for a second build cycle for no
reason.

---

## Why Sentry

The account already exists — org **`pe-yhunko`**, on Sentry's **EU region**
(`https://de.sentry.io`). One project is there today (`nutly`); SubEye needs its
own. EU hosting matters: `apps/landing/src/pages/*/privacy-policy.astro` names
each processor with its region, and every other processor in that list is either
EU or disclosed as global.

The server keeps posting `$exception` to PostHog EU
(`apps/server/src/utils/analytics.ts`). Do **not** migrate it — two surfaces, two
tools, and the join is the Clerk user id, which both sides key on.

---

## The brief

> Add client-side crash reporting to `apps/mobile` with Sentry.
>
> Today `AppErrorBoundary` (`src/shared/ui/error-boundary.tsx`) renders a screen
> and sends nothing anywhere. A production crash is currently invisible.

### Setup

Create the Sentry project first (dashboard, or the `sentry-cli` skill): org
`pe-yhunko`, platform **React Native**, suggested slug `subeye-mobile`.

```bash
bunx expo install @sentry/react-native
```

Add the config plugin to `apps/mobile/app.json`:

```json
["@sentry/react-native/expo", {
  "organization": "pe-yhunko",
  "project": "subeye-mobile",
  "url": "https://de.sentry.io/"
}]
```

**The `url` is not optional here.** It defaults to `https://sentry.io/` (US) and
the org is on the EU region, so a default-configured plugin uploads source maps
to an org that does not exist there and fails the build step — or worse,
silently ships without them.

### Two environment variables, with different rules

**`EXPO_PUBLIC_SENTRY_DSN` — public, and OPTIONAL.** Add it to
`src/shared/config/env.ts` as a nullable var like `BRANDFETCH_CLIENT_ID`, **not**
as a `required()` one:

```ts
SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN ?? null,
```

This is not a style preference. `env.ts` validates at module load, and
`shared/api/client.ts` is on the import graph of most test files — so a new
`required()` var breaks `bun test` for every checkout whose `.env` predates it,
*and* every EAS build whose environment was set up before it. That already
happened once this week with `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, which is why a
store build cannot boot today. Telemetry that is missing should degrade to
"reports nothing", never to "app does not start".

Add it to `.env` and `.env.example` in the same commit.

**`SENTRY_AUTH_TOKEN` — a real secret, build-time only.** No `EXPO_PUBLIC_`
prefix: it must not reach the bundle. It is what lets the plugin upload source
maps, without which every stack trace is minified garbage.

```bash
bunx eas env:create --environment production --name SENTRY_AUTH_TOKEN --value sntrys_… --visibility secret
```

Same for `preview`. Generate it in Sentry under Settings → Auth Tokens with the
`project:releases` scope.

### Wiring

`Sentry.init` at module scope in `src/app/_layout.tsx`, next to the existing
splash-screen side effects, and export the layout wrapped:

```ts
Sentry.init({
  dsn: env.SENTRY_DSN ?? undefined,
  enabled: !!env.SENTRY_DSN && !__DEV__,
  sendDefaultPii: false,
  tracesSampleRate: 0,
});
```

`tracesSampleRate: 0` and no profiling, no session replay. This is crash
reporting, not an observability platform — performance spans on a seven-screen
app would burn the free tier's quota to answer questions nobody has asked.

Then:

- **`AppErrorBoundary`** reports via `Sentry.captureException(error)`. Read the
  comment at the top of that file first: it renders when Clerk, Query or the
  navigator have *already* failed, so it deliberately touches nothing from that
  stack. The Sentry call must not be able to throw out of it — if
  `captureException` can reject or throw, guard it.
- **A global handler** for errors outside React's tree. `@sentry/react-native`
  installs one on init; verify it rather than adding a second.
- ~~**Identity:** `Sentry.setUser({ id: userId })` when Clerk resolves, `null` on
  sign-out.~~ **Superseded by v5:** there is no account and no identifier to
  attach. `shared/lib/sentry.ts` ships `sendDefaultPii: false` and sets no user,
  so an event carries the device and the stack and nothing else. The PostHog
  join this brief describes went away with the server.
- **Never send** email, username, subscription names, amounts or notes.

### What does NOT need changing

`apps/mobile/app.json` already declares
`NSPrivacyCollectedDataTypeCrashData` (linked, App Functionality) — it was added
for the server's PostHog reporting. Sentry needs no new manifest entry and no
new App Privacy label row. Do not add a duplicate.

### What DOES need changing — the privacy policy

This is the part that is easy to miss, and it is already overdue for a different
reason.

The published policy says, of PostHog: *"no SDK ships inside the app."* That
sentence became false when the paywall landed — `react-native-purchases` ships
today and **RevenueCat is not disclosed anywhere in either policy.** The pages
are live at URLs the binary links, so this is a real gap, not a future one.

In `apps/landing/src/pages/en/privacy-policy.astro` and its `uk/` twin, in the
processor `<dl>`:

1. Fix the PostHog entry's "no SDK" clause.
2. Add **RevenueCat — purchases (United States)**: receives the purchase
   receipt, the store transaction and the account identifier used as the app
   user id; it is how "you bought Pro" survives a reinstall. No subscription
   data, no email.
3. Add **Sentry — crash reporting (European Union)**: receives the stack trace,
   device model and OS version of a crash, keyed by the account identifier. No
   subscription data, no email, no session recording.
4. Bump `updated` on that document in `packages/legal/src/privacy-policy.ts`.
5. Redeploy: `bun run --cwd apps/landing build && bun run --cwd apps/landing deploy`,
   and ship an app build — the copy is bundled now, so the site alone does not
   update what a user reads in Settings.

The copy itself lives in `packages/legal`, once, for both surfaces. Edit both
locales together: `content.test.ts` catches a lost section, not a stale
translation.

### Gates

`bun run type-check`, `bun run test`, `bun run check:boundaries`. Then
`bun run --cwd apps/mobile prebuild` — the native module is not in the ios/
directory until it runs.

### Done when

- [ ] A thrown error in a screen appears in Sentry within a minute, with a
      readable stack (source maps uploaded)
- [ ] The event carries the Clerk user id and no email or subscription name
- [ ] Removing `EXPO_PUBLIC_SENTRY_DSN` from `.env` leaves the app booting and
      the test suite green
- [ ] Both privacy policies name Sentry **and** RevenueCat, and are redeployed
