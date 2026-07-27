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
| `b89a3c7` | **B1** Sign in with Apple · **B4** category management · **B5** first-run experience · consent notice |
| `b0753be` | Category emoji picker laid out in even rows of six |
| `9bbe2c2` | **B2** observability config + probed release state |
| `769852a` | Legal URLs prefixed `/en` and `/uk` (tracks the landing redesign) |
| `9ad5003` | **Paused/cancelled subscriptions never reached the client** — `status=all` |
| `cb65810` | List filters moved into a native sheet behind one header button |
| `0742049` | Separate header buttons, dot for active filters, monthly single-currency rows |
| `8aaf525` | Add/edit is a full-screen modal with its own stack + searchable category picker |
| *(this one)* | **B8** brand picker — the Website field is now a searchable logo avatar |

`8aaf525` is what **B8 below builds on**: add/edit is now
`presentation: "modal"` over its own `Stack` at
`app/(tabs)/subscriptions/form/`, with an X and a checkmark in the nav bar and a
Category drill-down screen carrying the native `UISearchBar` plus
create-in-place. One route serves both modes (`?id=` means edit). The in-flight
draft lives in a React context on the modal's layout
(`widgets/subscription-form/model/form-context.tsx`) so a pushed sub-screen can
write into it — that is the pattern B8 reuses.

---

## ⛔ Where submission actually stands (probed 2026-07-27, second pass)

| Check | Result |
| --- | --- |
| EAS project linked | ✅ `projectId e52f6dbb-…`, `owner yehor.hunko` |
| Clerk Apple SSO connection | ✅ configured |
| `com.apple.developer.applesignin` entitlement | ✅ written by `bun run prebuild` |
| Production Worker live | ✅ `GET /api/subscriptions` → `401 {"error":"Unauthorized"}` |
| `www.subeye.cc/terms-of-service/` | ✅ 200 |
| **EAS production env vars** | ⛔ **"No variables found for this environment"** |
| **`www.subeye.cc/privacy-policy/`** | ⛔ **404** |
| **`www.subeye.cc/uk/{terms-of-service,privacy-policy}/`** | ⛔ **404 — no `/uk` on the site at all** |

The two ⛔ rows are the whole remaining blocker list, and both are yours:

1. **EAS production has no variables.**
   `apps/mobile/src/shared/config/env.ts` validates at module load, so a
   production build today throws `Missing required env var:
   EXPO_PUBLIC_API_URL` before React renders a frame. Two commands, in M4 step 5.
2. **No privacy policy exists.** App Store Connect requires a resolving Privacy
   Policy URL, and Settings → Privacy 404s in the shipped app. The Ukrainian
   pages are missing too, which makes `localePrefix()` emit dead URLs — see M1
   for the decision that needs making (publish `/uk` pages, or stop emitting the
   prefix).

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

**M3 is done** (Apple Developer capability, Clerk SSO connection) and
`bun run prebuild` was run — `ios/SubEye/SubEye.entitlements` now carries
`com.apple.developer.applesignin: ["Default"]`. What is left is exercising the
flow with a real Apple ID, which is an M7 line item.

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

**Item 1 is now measured, not assumed:** EAS production holds **no variables at
all**, so both `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` are
missing. M4 step 5 is the fix. Set the API URL with no trailing slash and no
`/api` — the server's `basePath("/api")` rides on the Hono RPC accessor, and
appending it 404s every request at `/api/api/…`. The publishable key must be
`pk_live_`; a `pk_test_` key in a store build is a total silent failure.

**Still needs you** — both require a dashboard login:

2. Confirm the Clerk **production** instance has `subeye://` and the SSO
   redirect URL registered under Native Applications, and that its webhook
   points at `https://app.subeye.cc/api/webhooks/clerk` with the
   `CLERK_WEBHOOK_SECRET` Cloudflare holds. Account deletion depends on that
   webhook (`apps/server/src/routes/webhooks/clerk/handlers/userDeleted.ts`) —
   without it, deleted accounts leave orphaned Postgres rows, which is a GDPR
   problem, not just a tidiness one.
3. Run a real production-profile build and confirm the app reaches the API. The
   Worker itself is confirmed live and authenticating
   (`GET https://app.subeye.cc/api/subscriptions` → 401), so this is about the
   binary's config, not the backend.

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

## B8 — Brand picker ✅ landed

The "Website" text field is gone. The form opens with a tappable 88pt avatar
above the fields; tapping it pushes `form/brand.tsx` — a real `UISearchBar` over
Brandfetch's Brand Search API, rows of logo + name + domain, a "No logo" row
first, and a "Use `netflix.com`" row whenever what was typed parses as a host.
Picking a brand fills an **empty** Name field with the brand's name and never
overwrites typing.

- `model/brand-search.ts` — `brandSearchUrl` / `toBrandHits` (pure, tested) plus
  the query. 300ms debounce, TanStack's `signal` for cancellation, `retry: false`,
  `staleTime` 5 min against Brandfetch's 200-per-5-min-per-IP ceiling.
- **`BrandLogo` still uses Google favicons.** The picker renders results through
  the same component from the domain alone, so the preview is byte-identical to
  the row that ships — which is the consistency the Brandfetch CDN was supposed
  to buy, without a second image path or a key. Brandfetch's own `icon` URLs are
  hotlink-only and expire after 24h, so storing one was never on the table.
- **`meta: { persist: false }`** on the search query, and
  `shared/lib/query.ts` grew the `shouldDehydrateQuery` filter its comment had
  been inviting. Brandfetch's terms say the data is fetched live and not
  persisted, and the query key is whatever the user typed — neither belongs in a
  7-day MMKV cache.
- `EXPO_PUBLIC_BRANDFETCH_CLIENT_ID` is **optional** in `env.ts`.
- `normalizeBrandDomain` is untouched and still guards the write path; it is now
  also what decides whether the "Use …" row appears.

**Probed 2026-07-27:** the search endpoint returns full results with **no `c`
parameter at all**, and with a bogus one. So the feature works out of the box
and the id is not a blocker — but `c` is documented as required, so M4 step 5
now lists it as a third var. `brandSearchUrl` omits the parameter entirely when
unset rather than sending `?c=`.

**Release consequences, both landed:** `app.json`'s privacy manifest gained
`NSPrivacyCollectedDataTypeSearchHistory` (**not** linked — no account id
travels with the lookup), M1's processor list names Brandfetch, M2's label table
gained the row, and M7 gained two smoke-test lines including the offline one.

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

## What is left, in order

1. **M4 step 5**: the EAS production env vars. ⛔ blocks any usable build. Two
   are required; `EXPO_PUBLIC_BRANDFETCH_CLIENT_ID` is the optional third.
2. **M1**: publish the privacy policy and the four `/en` + `/uk` legal routes.
   ⛔ blocks submission, and the app links these today. The processor list now
   has to name Brandfetch.
3. **B3** client crash telemetry — batch the native module with any other
   prebuild.
4. **M2** App Store Connect record and privacy label, then **M7** device smoke
   test on a production build.
5. **B7** rate limiting (mostly the M6 dashboard rule), **B6** RevenueCat (still
   blocked on M5).

B3 still adds an `EXPO_PUBLIC_*` var and possibly a processor, so it means
revisiting M1's processor list, the App Privacy label, and the EAS production
environment — not purely client work. B8 already did that round.

---

## Verified on a simulator, 2026-07-27

Categories screen and counts, the category edit sheet and its delete warning,
the emoji grid, the filter sheet (including Reset and the header dot), the
paused-subscription fix, monthly single-currency rows, and both the create and
edit paths of the new modal with its category picker.

**Still needs real hardware:** the Apple sign-in flow end to end with a real
Apple ID, notification permission, and anything about a *production* build
reaching the API. Manual step **M7** is the checklist.
