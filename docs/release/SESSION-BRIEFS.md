# SubEye v4.0.0 — Claude Code session briefs

Follow-up work from the 2026-07-27 release-readiness audit. Each brief is
self-contained: open a fresh session, paste the brief, and it has what it needs.

Order matters only where stated. **B1 and B2 gate App Store submission.**

Already landed on `dev` (do not redo):

| Commit | What |
| --- | --- |
| `730ce60` | CI + pre-push quality gate |
| `9b94f95` | Privacy policy links, locale-aware legal URLs, real privacy manifest, Face ID string dropped |
| `40ecafe` | Subscription list follows its cursor (was silently capped at 50) |
| `4e3615d` | expo-router `ErrorBoundary` |
| `e532af0` | Category picker + inline create, `brandDomain` field |

---

## B1 — Sign in with Apple  ⛔ blocks submission

**Do the manual brief's step M3 first.** The Clerk dashboard and Apple
Developer configuration must exist before this code can work, or the button
authenticates and silently never creates a session.

> Add "Sign in with Apple" to the SubEye mobile app.
>
> The SSO row lives in `apps/mobile/src/widgets/auth-page/ui/sso.tsx` and
> currently offers Google and GitHub via Clerk's `useSSO`. App Store Guideline
> 4.8 requires an equivalent privacy-preserving login alongside third-party
> social login, and Google/GitHub do not qualify.
>
> Constraints:
> - Clerk is `@clerk/clerk-expo` 2.19.x — the **classic** API, not what current
>   Clerk docs show. Check the installed `@clerk/shared` types before writing
>   flow code.
> - Prefer the native `expo-apple-authentication` button on iOS over the web
>   OAuth flow — Apple requires its own button styling and wording, and a
>   Custom Tab / SFSafariViewController flow for Apple sign-in reads as
>   non-native to reviewers. On Android, fall back to Clerk's `oauth_apple`
>   web flow or hide the button; decide and comment the reason.
> - `BrandLogo` fetches favicons from Google's endpoint. Apple's button must
>   NOT use it — use the official SF Symbol `apple.logo` or the
>   `expo-apple-authentication` component.
> - Add the `usesAppleSignIn` config so prebuild writes the entitlement.
> - Strings go in `apps/mobile/messages/en.json` **and** `uk.json`, keys
>   `prefix_camelCase`. Never call `m.someKey()` at module scope.
>
> Read `apps/mobile/CLAUDE.md` before touching anything. Run `bun run lint`,
> `type-check`, `test` and `check:boundaries` before calling it done.

---

## B2 — Production configuration verification  ⛔ blocks submission

Pairs with manual steps M1/M2/M4. Mostly verification, little code.

> Verify the SubEye production build configuration end to end and fix what is
> wrong.
>
> 1. `apps/mobile/eas.json` production profile uses `environment: production`.
>    Confirm via `bunx eas env:list --environment production` that
>    `EXPO_PUBLIC_API_URL` is `https://app.subeye.cc` (no trailing slash, no
>    `/api` — see `apps/mobile/src/shared/config/env.ts`) and that
>    `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is a `pk_live_` key. A `pk_test_` key
>    in a store build is a total silent failure.
> 2. Confirm the Clerk **production** instance has `subeye://` and the SSO
>    redirect URL registered under Native Applications, and that its webhook
>    points at `https://app.subeye.cc/api/webhooks/clerk` with the
>    `CLERK_WEBHOOK_SECRET` that Cloudflare holds. Account deletion depends on
>    that webhook (`apps/server/src/routes/webhooks/clerk/handlers/userDeleted.ts`)
>    — without it, deleted accounts leave orphaned Postgres rows, which is a
>    GDPR problem, not just a tidiness one.
> 3. `apps/server/prod.wrangler.jsonc` sets `observability.enabled: false` with
>    `observability.logs.enabled: true`. Determine which wins in the installed
>    wrangler version and make it unambiguous — production with no logs is not
>    a state to discover during an incident.
> 4. Run a real production-profile build and confirm the app reaches the API.

---

## B3 — Client-side crash and event telemetry

Not a blocker, but shipping without it means debugging from one-star reviews.

> Add client-side error reporting to the SubEye mobile app.
>
> Today `apps/server/src/utils/analytics.ts` posts `$exception` events to
> PostHog EU from the Worker. The mobile app reports nothing — the new
> `AppErrorBoundary` (`apps/mobile/src/shared/ui/error-boundary.tsx`) shows a
> screen but sends nothing anywhere.
>
> Pick ONE of PostHog React Native or Sentry (a Sentry MCP is already wired in
> `.mcp.json`) and justify the choice in one line. Requirements:
> - Report from `AppErrorBoundary` and install a global JS error handler.
> - Identify by Clerk user id so a client exception joins the server's
>   `distinct_id`. Do not send email or subscription names.
> - No new EXPO_PUBLIC var without adding it to
>   `apps/mobile/src/shared/config/env.ts`, which validates at module load.
> - The app is offline-tolerant (MMKV-persisted query cache); telemetry must
>   never block a render or throw on a dead network.
> - If the SDK collects anything new, update `expo.ios.privacyManifests` in
>   `apps/mobile/app.json` to match, and note it for the App Privacy label.

---

## B4 — Category management screen

Completes what `e532af0` started.

> Add category management to the SubEye mobile app.
>
> `apps/mobile/src/entities/category` currently has `categoriesQuery()` and
> `useCreateCategory()`. The server (`apps/server/src/routes/categories.ts`)
> also supports rename, delete, and batch delete — none reachable from the app.
>
> Build a Settings → Categories screen: list, rename, delete, and change the
> emoji. The emoji picker should offer the grouped set in
> `packages/shared/src/domains/category/categorySchemas.ts`
> (`CATEGORY_EMOJI_GROUPS` is currently private — export it if needed; the
> server validates against it, so a client-invented emoji is a 422). Once a
> real picker exists, `pickCategoryEmoji` becomes the default for inline
> creation only — keep it, do not delete it.
>
> Deleting a category sets `subscriptions.category_id` to NULL
> (`onDelete: "set null"`), so warn with the affected count rather than
> blocking. Also add a category filter chip to the subscriptions list:
> `applySubscriptionFilters` already supports `categoryId`
> (`entities/subscription/model/filters.ts`) and nothing sets it.
>
> Read `apps/mobile/CLAUDE.md` first — especially the routing and native-tabs
> sections. Adding a screen needs an explicit argument; this one's is that the
> app can create categories it can never rename or remove.

---

## B5 — First-run experience and locale-derived default currency

> Two first-run defects in the SubEye mobile app.
>
> **1. Empty Home.** A new account lands on `HomePage` with a zero hero, an
> empty trend and an empty category card. The only way to add a subscription
> is a small "+" in the *other* tab's header. Give the dashboard a real empty
> state that routes to `/subscriptions/new`. Do not add a tutorial, a carousel,
> or sample data the user then has to delete.
>
> **2. Default currency is UAH for everyone.** `usersTable.preferredCurrency`
> defaults to `"uah"` (`apps/server/src/db/schema.ts`) and `UserService`
> returns `CurrencyUtils.DEFAULT_CURRENCY_CODE` when the user has no row, so a
> user in Berlin sees hryvnia on their first Home screen.
>
> The supported set is exactly five codes — see `SYMBOLS` in
> `apps/mobile/src/shared/lib/format/money.ts`: uah, usd, eur, gbp, pln.
> `expo-localization`'s `getLocales()[0].currencyCode` gives the device's
> region currency directly.
>
> Recommended shape (challenge it if you see better): seed once on the client.
> Guard with a per-Clerk-user MMKV flag (`shared/lib/mmkv.ts` has
> `deviceFlags`), fire only when the flag is unset and the device currency is
> in the supported set, and PATCH `/user/preferences`. No server change, no new
> API surface, and an explicit user choice is never overwritten because the
> flag is set on the first run either way. Add a test for the
> device-currency → supported-code mapping.

---

## B6 — RevenueCat paywall and Pro entitlement

**Only after M5 (App Store Connect IAP setup).** Do not start before there is
an approved product id to point at.

> Add SubEye Pro to the mobile app via RevenueCat.
>
> Decided model (do not redesign it):
> - **One non-consumable, $19.99 lifetime.** No auto-renewable subscription in
>   v1 — Guideline 3.1.2 paywall requirements, dunning and grace periods are
>   ops a solo developer does not need on day one, and a subscription-tracking
>   app charging a subscription is a joke reviewers make in public.
> - **Free:** unlimited subscriptions, the full Home dashboard, list, search,
>   filter, sort, every lifecycle action, multi-currency conversion.
> - **Pro:** renewal reminders · pricing phases (trial-ending and price-change
>   tracking) · categories and the category breakdown · CSV export.
> - The gate is *features*, not a subscription count cap. Nothing gated costs
>   the developer anything at runtime, so the free tier cannot be griefed into
>   a bill and the cap never punishes the users who evangelise the app.
>
> Implementation notes:
> - `react-native-purchases` + RevenueCat. Do not hand-roll StoreKit.
> - Entitlement is client-side only. `users` gets no new column: a cracked
>   client getting free on-device reminders costs nothing, and a server-side
>   check would put a paywall in the money path for no benefit.
> - Cache the entitlement in MMKV so a cold start with no network does not
>   downgrade a paying user to free. Fail **open** on a RevenueCat outage.
> - A "Restore purchases" action is mandatory (Guideline 3.1.1). Put it in
>   Settings next to the paywall entry, not only inside the paywall.
> - The paywall must link Terms and Privacy — `shared/config/legal.ts` exports
>   `termsUrl()` and `privacyUrl()`.
> - Existing users must not lose reminders they already have on. Grandfather
>   anyone with `notifications.renewalReminders` already true in MMKV, and say
>   so in the commit message.
> - Strings in both message catalogs.

---

## B7 — API rate limiting

> The SubEye API (`apps/server`) has no rate limiting. Every endpoint requires
> Clerk auth, so abuse needs an account — but one scripted account can burn
> Neon compute-hours, which is the meter that actually costs money.
>
> Prefer a Cloudflare Rate Limiting rule on `app.subeye.cc` over application
> code: it is free, it runs before the Worker, and it costs zero request
> latency. If that cannot express a per-user limit, add the smallest possible
> Worker-side check — but do not introduce a KV namespace or Durable Object for
> this without saying why in the commit message.
>
> Document whatever is chosen in `apps/server/README.md`.
