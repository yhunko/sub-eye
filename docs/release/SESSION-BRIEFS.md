# SubEye v4.0.0 — Claude Code session briefs

Follow-up work from the 2026-07-27 release-readiness audit. Each brief is
self-contained: open a fresh session, paste the brief, and it has what it needs.

Order matters only where stated.

Already landed on `dev` (do not redo):

| Commit | What |
| --- | --- |
| `730ce60` | CI + pre-push quality gate |
| `9b94f95` | Privacy policy links, locale-aware legal URLs, real privacy manifest, Face ID string dropped |
| `40ecafe` | Subscription list follows its cursor (was silently capped at 50) |
| `4e3615d` | expo-router `ErrorBoundary` |
| `e532af0` | Category picker + inline create, `brandDomain` field |
| _this session_ | **B1** Sign in with Apple · **B2** observability config · **B4** category management · **B5** first-run experience |

---

## ⛔ New blocker found while verifying B2

**The EAS project has never been initialised.** `bunx eas env:list --environment
production` fails with "EAS project not configured", and `apps/mobile/app.json`
has no `extra.eas.projectId`. With `eas.json` on `appVersionSource: "remote"` +
`autoIncrement`, **no EAS build can run at all** — not production, not preview,
not the development client.

`eas init` is interactive and needs the account, so only you can run it:

```bash
cd apps/mobile && bunx eas init
```

Then M4's `eas env:create` steps become runnable. Everything in M7 (device smoke
test) and the whole submission path is behind this. Do it first.

---

## B1 — Sign in with Apple ✅ landed

Native iOS Sign in with Apple, per Guideline 4.8.

- `apps/mobile/src/widgets/auth-page/ui/apple-sign-in.tsx` — `useAppleSignIn()`
  and `AppleSignInButton`, wired into both `sign-in-page.tsx` and
  `sign-up-page.tsx` above the Google/GitHub row.
- Uses clerk-expo 2.19's **`useSignInWithApple()`**, not
  `useSSO({ strategy: "oauth_apple" })`. The hook drives
  `expo-apple-authentication` and posts the identity token
  (`signIn.create({ strategy: "oauth_token_apple" })`, transferring to `signUp`
  when the account is new). No SFSafariViewController anywhere in the flow.
- Renders Apple's own `ASAuthorizationAppleIDButton` (white, 52pt, corner radius
  14 — never smaller than the other providers). `BrandLogo` is not involved.
- **iOS only.** `expo-apple-authentication` has no Android implementation and
  4.8 is an App Store rule; Android keeps Google/GitHub. Reason is commented in
  the component.
- `app.json`: `ios.usesAppleSignIn: true` plus an explicit
  `"expo-apple-authentication"` plugin entry. New deps:
  `expo-apple-authentication`, `expo-crypto`.
- No new strings — the native button localises itself, and failures reuse
  `auth_ssoFailed`.

**Still needs you:** manual step **M3** (Apple Developer capability + Services
ID + key, Clerk SSO connection, native redirect URL) and a native rebuild
(`bun run prebuild` then a dev-client or EAS build) — the entitlement only
exists after prebuild. Until M3 is done the button authenticates and Clerk never
creates a session.

---

## B2 — Production configuration verification ⚠️ partly landed

**Landed:** the observability contradiction is gone.
`apps/server/prod.wrangler.jsonc` (and `dev.wrangler.jsonc`) had
`observability.enabled: false` with `observability.logs.enabled: true`.
Verified against the installed wrangler 4.83.0: it does **not** reconcile the
two locally — `deploy` posts the block verbatim (`observability:
config.observability`) and lets the Workers API decide, so the answer was not
knowable from the client. Both are now `true`, traces stay `false`.
`wrangler deploy --dry-run` on the prod config passes.

**Still needs you** — all of it requires a dashboard login or the EAS account:

1. `eas init` (see the blocker above), then confirm via
   `bunx eas env:list --environment production` that `EXPO_PUBLIC_API_URL` is
   `https://app.subeye.cc` (no trailing slash, no `/api` — see
   `apps/mobile/src/shared/config/env.ts`) and that
   `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is a `pk_live_` key. A `pk_test_` key in
   a store build is a total silent failure.
2. Confirm the Clerk **production** instance has `subeye://` and the SSO
   redirect URL registered under Native Applications, and that its webhook
   points at `https://app.subeye.cc/api/webhooks/clerk` with the
   `CLERK_WEBHOOK_SECRET` Cloudflare holds. Account deletion depends on that
   webhook (`apps/server/src/routes/webhooks/clerk/handlers/userDeleted.ts`) —
   without it, deleted accounts leave orphaned Postgres rows, which is a GDPR
   problem, not just a tidiness one.
3. Run a real production-profile build and confirm the app reaches the API.

---

## B4 — Category management ✅ landed

- `packages/shared`: `CATEGORY_EMOJI_GROUPS` and `CategoryEmojiGroup` are now
  exported, so the picker is built from the same list `categoryEmojiSchema`
  validates against and can never produce a 422.
- `entities/category`: `useUpdateCategory()` and `useDeleteCategory()`. Both
  invalidate the dashboard **and** the subscription list — a rename would
  otherwise leave the old name on every row's denormalised `category`.
- `widgets/categories-page/`: the list (`Settings → Categories`, with each
  category's subscription count) and a `formSheet` edit route with a name field,
  the grouped emoji grid, and a destructive delete.
- Delete warns with the number of subscriptions that move to Uncategorized
  rather than blocking — `subscriptions.category_id` is `onDelete: "set null"`.
- Routes `app/(tabs)/settings/categories/index.tsx` and `.../[id].tsx`.
- `pickCategoryEmoji` is untouched and still the default for inline creation.
- The subscriptions list gained a **category filter chip strip**, rendered only
  when the account has categories.

**Deliberately not built:** an "Add category" button on the management screen.
Creation stays inline in the subscription form (a category with no subscription
in it is a dead category); the screen's footnote says where they come from.
Revisit if the footnote turns out not to be enough.

---

## B5 — First-run experience ✅ landed

**Empty Home.** `widgets/home-page/ui/home-empty.tsx` replaces the zero hero /
flat trend / empty category card with one sentence and a button to
`/subscriptions/new`. It shows only when the account has nothing active, nothing
paused, **and** no spend in the six-month trend — the last clause is what keeps
a user who just cancelled their last subscription looking at their history
instead of at a first-run screen.

**Default currency.** `entities/user/api/use-seed-preferred-currency.ts`, mounted
next to `RenewalReminderSync` in `(tabs)/_layout.tsx`. Adopts the device
region's currency once per account per device, guarded twice:

1. an MMKV flag set on the first run **whether or not anything changed**, so a
   failed PATCH is never a second chance to overwrite a hand-picked currency;
2. the stored preference must still be the server default `"uah"` — `deviceFlags`
   is per-install, so without this a user who chose USD in Berlin would be
   silently re-denominated by their second phone.

`supportedCurrencyCode()` in `shared/lib/format/money.ts` does the mapping and is
covered by six cases in `money.test.ts`. One of them caught a **pre-existing
bug**: `SYMBOLS[code]` walked the prototype, so `formatMoney(x, "constructor")`
rendered `"undefined1,234.50"`. All three readers now go through a guarded
`currencyFor()`.

---

## B3 — Client-side crash and event telemetry

Not a blocker, but shipping without it means debugging from one-star reviews.

> Add client-side error reporting to the SubEye mobile app.
>
> Today `apps/server/src/utils/analytics.ts` posts `$exception` events to
> PostHog EU from the Worker. The mobile app reports nothing — the
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
>
> Note that this adds a native module, so it needs a prebuild + rebuild — batch
> it with any other native change rather than burning a build on it alone.

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
>   tracking) · categories, the category breakdown and the category filter ·
>   CSV export.
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
> - Categories are now reachable from Settings → Categories and from the list's
>   filter chips. Gating them means gating **three** surfaces, not one — decide
>   whether the chips disappear or deep-link to the paywall, and be consistent.
> - Strings in both message catalogs.

---

## B7 — API rate limiting

> The SubEye API (`apps/server`) has no rate limiting. Every endpoint requires
> Clerk auth, so abuse needs an account — but one scripted account can burn
> Neon compute-hours, which is the meter that actually costs money.
>
> Prefer a Cloudflare Rate Limiting rule on `app.subeye.cc` over application
> code: it is free, it runs before the Worker, and it costs zero request
> latency. See manual step **M6** for the suggested rule — the dashboard part is
> yours, this brief is the code/doc half. If the dashboard rule cannot express a
> per-user limit, add the smallest possible Worker-side check — but do not
> introduce a KV namespace or Durable Object for this without saying why in the
> commit message.
>
> Document whatever is chosen in `apps/server/README.md`.

---

## Not verified in any session so far

Everything below needs a real build on real hardware. None of it is covered by
`type-check` / `test` / `lint` / `check:boundaries`, all of which are green.

- The Apple button rendering, and the whole SIWA flow end to end (needs M3 + a
  native rebuild).
- The `Settings → Categories` sheet detent behaviour and the emoji grid inside
  it.
- Home's empty state under the transparent iOS header.
- The first-run currency seed against a genuinely new account.
- The third (category) chip strip's effect on the sticky filter header height.

Manual step **M7** is the checklist for all of it.
