# @subeye/mobile — Agent Guidelines

`apps/mobile` (`@subeye/mobile`) is the **v4 SubEye client**: an Expo (React Native, expo-router) app over the pruned Hono API in `apps/server`. It replaces the retired React/Vite web client. Read this before touching mobile code.

**Nine screens. Every addition requires an explicit argument.** The v3 client reached 33,991 hand-written LOC because features were fun to build, not because they were needed. Do not reproduce that here.

The two beyond the original seven, and why: **`settings/notifications`**, because reminder config outgrew a single switch the moment it had a time, several lead times and a health readout — and a status section is the only way a user can tell a silent OS refusal from an app bug. **`subscriptions/due/[date]`**, because a digest notification that names three services has to be able to show exactly those three, and the list's filter store is deliberately not persisted.

## Layers & structure

FSD, four layers, imports flow **downward only**:

```
apps/mobile/src/
  app/                    expo-router routes — thin adapters + _layout providers
  widgets/<name>-page/    page composition (ui/, index.ts)
  entities/<domain>/      domain data + query hooks (api/, model/, index.ts)
  shared/
    api/                  the ONLY apiClient (hc<ServerRpcType> + createAuthFetch)
    auth/                 Clerk token bridge + SecureStore token cache
    config/env.ts         EXPO_PUBLIC_* validation
    lib/                  query client + MMKV persister, mmkv, online
    i18n/                 Paraglide bootstrap + locale resolution
    ui/                   theme tokens, nativeHeaderChrome
```

- **Domain rules live in `packages/*`, not here.** This app holds routes, page
  composition, data hooks and platform adapters. Anything that projects an
  occurrence, derives a status, converts money or decides what is legal belongs
  to `@subeye/{time,money,model,lifecycle,pricing,spend,reminders,store}` — and
  re-deriving one here is how the client and the server drift apart. Formatting
  a value the DTO already carries is presentation and stays.
- **There is NO `features` layer.** With seven screens it is ceremony. Page composition goes in `widgets/`, domain data in `entities/`. `dependency-cruiser` fails the build if `src/features/` appears (`mobile-no-features-layer`).
- **Public API per slice via `index.ts`.** Import `@/entities/dashboard`, never `@/entities/dashboard/api/use-dashboard`.
- **Path alias `@/* → src/*`** (tsconfig `paths`; Metro and `bun test` both resolve it).
- **Enforced** by `bun run check:boundaries` (root `dependency-cruiser.cjs`, rules prefixed `mobile-`). The rules match the **alias string**, not a resolved path — the root tsconfig has no `paths`, so `@/…` never resolves and dependency-cruiser keeps the raw specifier. This is why cross-layer imports must always use `@/…` and never a `../../` climb.

## Routing (expo-router)

`src/app/` is the **only** route directory.

- **Route files are thin adapters.** A route reads params (`useLocalSearchParams`) and renders a page component from a widget's public API. Nothing else. Any non-route file placed in `src/app/` silently becomes a route.
- **`_layout.tsx` is the FSD app layer.** The root provider order is **load-bearing**:

  ```
  SafeAreaProvider               only the (auth) screens read insets from it
    └ ClerkProvider (tokenCache: expo-secure-store)
      └ TokenBridge              wires getToken() into shared/api/client
        └ QueryClientProvider    NOT PersistQueryClientProvider — see Transport
          └ Stack
  ```

  Clerk sits **above** Query so the token getter is wired before the first request fires. Reordering breaks auth on the first request after a cold start.
- **The app never blocks on Clerk.** `(tabs)/_layout.tsx` mounts the tab tree from `sessionHint` (an MMKV boolean the token bridge writes) while `isLoaded` is still false, so a cold start paints the persisted Query cache instead of a black screen — `isLoaded` waits on a network handshake, and nothing holds the splash by then. Clerk still decides: a *resolved* signed-out state redirects. Because a refetch can now fire before the bridge exists, `shared/api/client.ts` makes the first request **await** the bridge (3s ceiling) rather than sending it anonymous.
- `_layout.tsx` also does two bare side-effect imports — `import "@/shared/lib/online"` (connectivity → `onlineManager`) and `import "@/shared/lib/focus"` (`AppState` → `focusManager`). **Neither has a binding — do not let an auto-import cleanup delete them**, or online/offline detection and every foreground refetch die app-wide.
- **Every layout a deep link can land inside needs an `unstable_settings` anchor.** A deep link builds the stack from the URL alone, so `subeye:///subscriptions/x` — a widget row, a tapped reminder — mounted the detail screen as the *only* route in the subscriptions stack: no back button, and that screen hides the tab bar by design, so the app was a dead end until it was force-quit. The root layout anchors `(tabs)`; `(tabs)/subscriptions/_layout.tsx` anchors `index`. Adding a new deep-linked route means checking the anchor of every layout above it.
- **Sheets are native `formSheet` routes**, the only sheet mechanism in the app: Manage-pricing, Pause, the category editor, and the list-options sheet that is now **Android's fallback only**. `presentation: "formSheet"` with `sheetGrabberVisible: true`, plus a fixed detent for anything holding a ScrollView (a `flex: 1` scroller has no intrinsic height, so `fitToContents` can measure to nothing). There is **no NiceModal / modal-manager equivalent** — the navigator owns presentation.
- **A sheet is the fallback, not the first answer.** Where UIKit has a control, use the control: the subscriptions list puts sort / group / status / category behind a real **UIMenu** via `unstable_headerLeftItems` / `unstable_headerRightItems` (expo-router's wrapper over `headerLeftBarButtonItems`), and the detail screen does the same for its lifecycle actions. Items take **`label`, not `title`** — expo-router renames the RNScreens field — and submenus are **single-selection by default** (`multiselectable` is false unless set), so UIKit draws the checkmark itself from each action's `state: "on" | "off"`. Set **`multiselectable: true` on the outer `menu`** whenever its children are all submenus: the default sends `UIMenuOptionsSingleSelection` to a menu that owns no selectable actions, which is what the missing checkmarks were traced to. UIKit gives a submenu **no subtitle, no value slot and no per-item tint**, so a submenu announces itself two ways and only when it is off its default: the **filled variant of its own SF Symbol**, and the chosen value appended to the label (`"Status · Paused"`). A submenu at rest stays a plain glyph and a bare noun — spelling out every default made the top level four sentences long, and the defaults are the longest strings in their own lists. A submenu has **no `disabled`** field, so an empty submenu has to be omitted from the array rather than greyed out. expo-router only swaps native items in **on iOS**, so a screen that uses them keeps its `headerLeft`/`headerRight` Pressables as the Android path — and anything added to the menu must be added to Android's sheet too, or the feature silently does not exist there.
- **Add/Edit is the exception: a `presentation: "modal"` route that owns its own `Stack`** (`app/(tabs)/subscriptions/form/`). It was a formSheet pinned at a 0.9 detent — a modal's footprint without a modal's navigation — which forced the category picker into an ActionSheet with no search and no create. A sheet cannot push a sub-screen without stacking a second sheet on itself. Anything that outgrows an action sheet becomes a pushed screen in that nested stack; the form's draft lives in a React **context** on its layout (`widgets/subscription-form/model/form-context.tsx`), NOT a module store — a half-typed subscription must die with the modal.
- **`headerSearchBarOptions` uses `placement: "stacked"` + `hideWhenScrolling: false`** on both the category picker and the subscriptions list — a real `UISearchBar` pinned under the nav bar, glass header and all. Not `placement: "automatic"`: UIKit picks a field that retracts on the first scroll, so on a list long enough to want searching the control is gone exactly when it is wanted. If it ever appears not to render, suspect a stale Fast Refresh before concluding the platform cannot do it: a full relaunch was the difference here, and a hand-rolled `TextInput` lookalike was very nearly shipped over it.
- **A sheet's commit action goes in its nav bar, not under its content.** The category editor is the one sheet that keeps `headerShown` — save and delete were buttons beneath a 120-tile emoji grid, which is below the fold of a 0.9 detent, so committing a typed name meant scrolling past every emoji first. It spreads `nativeHeaderChrome` like any headered screen and fills the bar from `CategorySheet` (`unstable_headerLeftItems` = delete, `unstable_headerRightItems` = save, plus the Android Pressables). Any sheet whose content can outgrow the detent should do the same.
- **Confirms are native**: ActionSheet + `Alert`. Not a custom dialog component.

## Native tabs & headers

- **Tab bar:** `<NativeTabs minimizeBehavior="onScrollDown">` from `expo-router/unstable-native-tabs` — Liquid Glass on iOS 26, Material 3 on Android. Three triggers: `(home)`, `subscriptions`, `settings`.
- **ALPHA CONSTRAINT:** triggers must be **static**. Do not map an array into `<NativeTabs.Trigger>`, do not conditionally render one, do not compute `name`. Icons use two platform props — `sf` (iOS SF Symbol name) and `md` (Android Material Symbols name); there is no cross-platform icon component.
- **Tabs need a nested `Stack` per tab to get a header.** `NativeTabs` children are bare screens with no navigator, so `<Stack.Screen options>` is inert on them. Each tab is a folder with `_layout.tsx` (a `Stack` carrying `nativeHeaderChrome`) plus `index.tsx`.
- **Header chrome comes from `@/shared/ui/header`** (`nativeHeaderChrome`), spread into every headered screen. iOS gets `headerTransparent: true` + `scrollEdgeEffects: { top: "soft" }`; **Android gets an OPAQUE bar** — glass is iOS-only there, and a transparent header leaves scroll content stacked *under* the bar because `scrollEdgeEffects` and `contentInsetAdjustmentBehavior` are both iOS no-ops.
- **Never** set `headerStyle.backgroundColor` or `headerBlurEffect` on iOS: a solid background kills the glass, and `headerBlurEffect` paints a permanent gray band over the near-black app while overlapping `scrollEdgeEffects`.
- **Every scroll view under a header** sets `contentInsetAdjustmentBehavior="automatic"` and keeps `contentContainerStyle.paddingBottom` small (~24) — the automatic inset already clears the floating tab bar. Do not swap it for a manual `useSafeAreaInsets` padding.
- **`scrollEdgeEffects` only blurs content passing under HEADER ITEMS.** Home shipped `headerShown: false` and therefore had nothing behind its status bar — cards slid up into bare pixels. It has a header again, and the two things in it are the argument for it: the **current month**, which every figure on the screen is scoped to and which the hero never names, and the **same `+` bar button the subscriptions list carries**. A header repeating the tab's own word is still not worth the fold.
- **A nested horizontal ScrollView sets `automaticallyAdjustContentInsets={false}`** (Home's upcoming rail). Without it the inner scroller inherits the outer one's automatic inset and starts pushed in by the status-bar height.

## Transport

- `shared/api/client.ts` holds the **only** `apiClient`. It is built **once at module load** over a single mutable module-level `getToken`; `useClerkTokenBridge` swaps it via `setTokenGetter`. **Never rebuild the client on auth change, and never reset the getter on sign-out** — `getToken()` returns null when signed out, so anonymous and signed-in are both correct with no reset.
- **`getToken()` is NOT offline-cached.** `ClerkProvider` is constructed with `publishableKey` and `tokenCache` only — no `__experimental_resourceCache` — so the token cache is in-memory and roughly 60 seconds wide, and `tokenCache` (SecureStore) holds refresh material rather than a usable session JWT. Every cold start needs a live `/v1/client` round-trip before Clerk can resolve signed-in, so **offline is a logout in practice**. `shared/auth/session-hint` exists to hide the resulting blank frame, not to fix it.
- `hc` comes from **`hono` directly**, not from `@subeye/server/client`. That export is a **types-only build** (`apps/server/dist/src/client.d.ts`) — it provides `ServerRpcType`, not a runtime factory. This is the documented exception to the root CLAUDE.md "packages export source" rule: Metro is not Vite, and dragging the server source into the mobile typecheck is not a DX win.
- The server sets `.basePath("/api")`, which Hono RPC reflects as the **`.api` accessor** at call sites (`apiClient.api.analytics.…`). Base URL = **`EXPO_PUBLIC_API_URL` verbatim** — appending `/api` here doubles the prefix and every request 404s at `/api/api/…`.
- **Every non-2xx throws an `ApiError`** carrying `status` and the server's machine-readable `code` (from `{ success:false, error:{ code, message } }`). Branch on `error.code`, never on `error.message` — the message is human copy and will change.
- **`assertOk(res)` before `res.json()`.** Hono RPC leaks the route's error-response shapes into the success type; `assertOk` narrows to the 2xx branch.
- **`createAuthFetch` casts its result to `typeof fetch`.** `bun-types` (in scope for `bun:test`) augments the global fetch with a required `preconnect` static that a React Native transport does not implement, and Hono's `fetch` option demands `typeof fetch`. The cast is at the boundary; Hono only ever invokes the call signature.
- **Query cache is persisted to MMKV** (`shared/lib/query.ts`), `maxAge`/`gcTime` 7 days, `buster` = `expo.version` + a manual `PERSIST_SCHEMA`. Bump `PERSIST_SCHEMA` on any OTA update that changes a persisted DTO shape.
- **The cache is hydrated SYNCHRONOUSLY at module load, not by `PersistQueryClientProvider`.** That component starts its restore inside a `useEffect`, so React has already committed a frame with an empty cache — and every screen branches on `isPending`, so that frame is a full-page spinner. MMKV reads synchronously, so `shared/lib/persisted-cache.ts` applies TanStack's own expiry/buster rules and `hydrate()`s before the first render; `persistQueryClientSubscribe` handles saving. **Do not reintroduce `PersistQueryClientProvider`** — its `isRestoring` gate also pauses every query until the restore resolves, which is the opposite of cache-first.
- **There is no pull-to-refresh.** Revalidation is invisible: `shared/lib/focus.ts` wires `AppState` into TanStack's `focusManager`, so returning to the app refetches everything stale (>5 min) behind the cached screen. RN has no `visibilitychange`, so **without that bridge `refetchOnWindowFocus` silently does nothing** — which is why a `RefreshControl` used to be load-bearing. Do not add one back.
- **MMKV is v4 (Nitro):** instantiate via `createMMKV()`, **not** `new MMKV()` (which throws on v4).

## Crash reporting (Sentry)

`shared/lib/sentry.ts` owns `Sentry.init` and is the only file that imports
`@sentry/react-native` outside `_layout.tsx`. Everything else reports through
`reportError` / `setSentryUser`. Org **`pe-yhunko`**, project **`subeye`**,
**EU region**. The slug in `app.json` must match the real project exactly — a
wrong one is not a warning, it is `400 One or more projects are invalid` and a
dead production build (see below).

- **`metro.config.js` uses `getSentryExpoConfig`, not `getDefaultConfig`.** It is
  what stamps a Debug ID into the bundle and the map beside it. Swap it back and
  the maps still upload, they just never pair with the bundle — every production
  stack trace stays minified, silently and only in Release.
- **The plugin's `url` must be `https://de.sentry.io/`.** It defaults to the US
  host, where this org does not exist. It ends up in `ios/sentry.properties` as
  `defaults.url`, which is what the upload step reads.
- **Never set `tracesSampleRate`, not even `0`.** The SDK enables tracing on
  `typeof tracesSampleRate === "number"`, so a literal `0` installs stall
  tracking, native frame tracking and the app-start/AppRegistry hooks — per-frame
  work on the JS thread whose every transaction is then sampled away. No
  profiling, no session replay, no screenshots either.
- **`EXPO_PUBLIC_SENTRY_DSN` is optional and must stay optional.** `env.ts`
  validates at module load and sits on most tests' import graph; a `required()`
  var there breaks `bun test` for every stale checkout *and* every EAS
  environment configured before it. Telemetry degrades to "reports nothing",
  never to "app does not start".
- **`SENTRY_AUTH_TOKEN` has no `EXPO_PUBLIC_` prefix** — build-time only, set per
  EAS environment. It must never reach the bundle.
- **The three report sites are deliberate**: `AppErrorBoundary` (render crashes),
  the `QueryCache`/`MutationCache` `onError` in `shared/lib/query.ts` (Query
  swallows every queryFn throw, so without it reporting would cover render
  crashes and almost nothing else), and the SDK's own global handlers. A 4xx
  `ApiError` is filtered out — 401 is an expired session, not a bug.
- **Identity lives in `shared/auth/token-bridge.ts`**, which already watches
  Clerk. Id only — never email, username, subscription name, amount or note.
- **`@sentry/react-native` is stubbed in `test-preload.ts`.** It reaches
  `react-native/Libraries/TurboModule/...`, past the `react-native` stub, so any
  test that transitively imports the query client or the token bridge dies on a
  Flow parse error without it.

## Reminders (local notifications)

`shared/lib/notifications/` — **no push tokens, no APNs/FCM, no server endpoint,
no DB row, no cron.** The pending set is a pure function of the subscription list
the app already holds, rebuilt wholesale (cancel-all → recompute → reschedule) on
every foreground. Wholesale is what makes it idempotent: no stored notification
ids, no reconciliation, nothing to drift.

WHAT to remind about lives in `@subeye/reminders`; this directory is the platform
half — scheduling, MMKV storage, tap routing, and `copy.ts`, which renders the
planner's strings from `m`. A pure package cannot import paraglide, so the copy
is injected rather than looked up.

- **The plan is capped at `REMINDER_BUDGET`** (56, exported by
  `@subeye/reminders`) because iOS silently drops all but the 64 soonest pending
  local notifications. `syncReminders` asks the planner for `BUDGET + 1` so it
  can report truncation, then schedules the first `BUDGET`. The reasons behind
  the number — grouping, sort-then-trim, the device zone, the currency rule —
  are invariants of the planner and documented in
  [packages/reminders/CLAUDE.md](../../packages/reminders/CLAUDE.md). Do not
  restate them here, and do not re-derive any of them in this app.
- **`syncReminders` takes settings ALREADY GATED** — run them through
  `effectiveSettings`. `shared/` cannot import `entities/pro` without an upward
  FSD edge, and reading the entitlement inside would put the Pro gate in a second
  place. Free keeps renewal reminders, the time of day and the whole status
  section; Pro buys extra lead times and trial-ending warnings. **The gate must
  never sit between "warned" and "not warned"** — reminders are the retention
  mechanism, and a tracker that never speaks has no reason to stay installed.
- **`readNotificationHealth` waits on `createSettleBarrier` before reading.** A
  rebuild cancels every pending notification and only then schedules the new
  set, one awaited native call at a time, so anything sampling the pending list
  inside that window counts ZERO over a schedule that is about to exist. Two
  syncs race on every foreground (the screen's effect and the layout's
  `ReminderSync`), and the losing run's completion callback lands inside the
  winner's rebuild — which reported "nothing scheduled" on a healthy install
  with 24 reminders pending. The barrier is a separate tested module because
  the loop-until-stable part is what makes it correct.
- **A `syncGeneration` counter guards the schedule loop.** Scheduling is up to 56
  awaited native calls and the settings screen can start a second sync in the
  middle of them; without the per-iteration check the newer run's cancel-all wipes
  what the older one wrote, and the older one's tail then lands after it.
- **A DATE trigger does not read back as a date on iOS.** `scheduleNotificationAsync`
  turns it into a `UNCalendarNotificationTrigger`, which serialises to
  `{ type: "calendar", dateComponents: { year, month, day, … } }` with no
  timestamp — `.date` and `.value`, the fields the input types advertise, are
  both `undefined`. `shared/lib/notifications/trigger-time.ts` owns that
  conversion and is tested against the real shape. `month` is 1-based there and
  0-based in `Date`. This shipped wrong once and was silent: the count stayed
  correct, so the status section read "nothing scheduled" over a full, working
  schedule. Anything user-facing must degrade to the count, never to a claim.
- **Taps route through `useLastNotificationResponse`**, never
  `addNotificationResponseReceivedListener` — the listener only fires while the
  app is already running, and a reminder is usually tapped from a lock screen with
  the app killed.
- Settings live in **MMKV, per-device and per-install** — two phones configure
  separately and a reinstall forgets. `readNotificationSettings` migrates the v1
  boolean so an install that already had reminders on does not go silent.
- **`react-native-mmkv` is stubbed in `test-preload.ts`** with a real in-memory
  store. `createMMKV()` runs at import and throws without the native side, so
  anything reading a device flag dies on import rather than on use.

## Home Screen widgets (iOS only)

`targets/widget/` is a **WidgetKit app extension**, generated into the Xcode
project by `@bacons/apple-targets` on prebuild. Small = next payment, medium =
month total + the next three renewals. There is no Android equivalent: an
Android app widget is RemoteViews/Glance and shares none of this code.

- **The widget never calls the API.** It reads one JSON string the app wrote to
  the shared App Group. No token in the extension, no auth refresh, no offline
  hole — and nothing to keep in sync with the server.
- **`group.cc.subeye.app` is spelled in three files that must agree exactly**:
  `ios.entitlements` in app.json, `targets/widget/expo-target.config.js` (which
  reads it back off the app config rather than repeating it), and
  `WIDGET_APP_GROUP` in `shared/lib/widget/sync.ts` — mirrored by
  `WidgetStore.appGroup` in Swift. A mismatch is **silent**:
  `UserDefaults(suiteName:)` hands back a working store that simply never sees
  the other side's writes.
- **The group and BOTH App IDs must be registered on the Apple Developer portal
  before any iOS build**, local ones included — `cc.subeye.app` and the widget's
  own `cc.subeye.app.widget`. Apple issues no profile for an unregistered
  capability, so the build dies during "Planning build" having fallen back to a
  wildcard profile (`iOS Team Provisioning Profile: *`), which can never carry
  App Groups. The four-click fix and the `eas build` alternative are in
  [docs/release/TESTFLIGHT-STEPS.md](../../docs/release/TESTFLIGHT-STEPS.md).
- **Every string in the snapshot is already formatted and already translated.**
  The extension owns no `NumberFormatter`, no currency logic and no catalog:
  Paraglide cannot be reached from Swift, and a second copy of the money rules
  is exactly how a widget starts disagreeing with the screen it mirrors. The
  cost is that a locale change has to rewrite the snapshot — `WidgetSync` does,
  on every foreground.
- **`WidgetItem.date` is the one exception, and it is an instant, not a string.**
  `.relative(presentation: .named)` formats at render time, so the provider's
  `.after(midnight)` refresh policy is what stops a row written today from still
  reading "tomorrow" the morning the payment lands. Do not replace that policy
  with `.atEnd`.
- **The day count and that refresh are both in a UTC calendar, never
  `Calendar.current`.** A payment date is a calendar day stored as its UTC
  midnight, and every JS reader decodes it that way (`formatDate` pins
  `timeZone: "UTC"`, `planReminders` walks `getUTC*`). Counting in the device's
  zone made the widget the only surface answering in a different calendar: the
  same charge read "tomorrow" on the detail screen and "the day after" here, and
  a day early for anyone west of UTC. `WidgetItem.utcCalendar` is the one to use,
  and the timeline refreshes at UTC midnight because that is when the wording
  changes.
- **`toISOString()` carries milliseconds**, which `ISO8601DateFormatter` drops
  unless given `.withFractionalSeconds`. Parsing it wrong is silent — `date(from:)`
  returns nil and every row renders as "now".
- **`syncWidget` de-duplicates before writing.** WidgetKit gives an app a bounded
  number of timeline reloads per day; spending them on identical redraws is how a
  widget goes stale exactly when a payment lands. It runs on every foreground, so
  the comparison is doing real work.
- **Pro gates the CONTENT, not the widget.** Anyone can add it — a locked
  snapshot simply carries no figures at all, because a Home Screen is visible to
  whoever is standing behind the user and a paywall is a reason to write less to
  disk, not to blur what is already there.
- Logos are fetched **in the timeline provider**, not shipped in the snapshot.
  The alternative was base64-ing favicons into shared `UserDefaults` plus a cache
  to stop re-downloading them; `URLCache` does that for free. A failed fetch
  degrades to the same letter tile `BrandLogo` draws.
- `configurationDisplayName` / `description` are Swift literals and therefore
  **English only** — localising the widget gallery entry needs a `Localizable.strings`
  in the target.

## Strings (i18n)

- Paraglide, locales **en + uk**, `baseLocale: "en"`. Catalogs live in `apps/mobile/messages/{locale}.json` with their own `project.inlang` — **deliberately NOT the web client's 785-key catalog**. Keep the mobile catalog small.
- Compiled into `src/shared/i18n/paraglide` (**gitignored**) by `bun run i18n:generate`, which auto-runs before `start`/`ios`/`android`/`type-check`.
- **EAS runs none of those scripts.** It calls `expo export:embed` directly, and the gitignored output is not in the uploaded archive either, so a cloud build fails to resolve `./paraglide/runtime` while every local build succeeds. The `eas-build-post-install` script is what compiles the catalogs on the builder — deleting it breaks EAS only, and silently.
- Strategy is `--strategy globalVariable baseLocale` — **space-separated, two arguments**. A comma-joined `globalVariable,baseLocale` compiles to one malformed strategy and makes `getLocale()` throw at runtime.
- **NEVER call `m.someKey()` at module scope.** Module-level tables hold the message-function *reference* (`label: m.foo`) and invoke it at render time; otherwise the string freezes in whichever locale was active at import.
- Locale is resolved **once at bootstrap** (`shared/i18n/index.ts` → `expo-localization` `getLocales()` → first of en/uk → else **en**) and re-synced by `useAppLocale()` in the root layout, which re-keys the `Stack`. Language switching is **OS-native only** (per-app language in iOS Settings / Android 13+) — no in-app locale state, no MMKV override.
- Native OS copy (app display name, permission prompts) lives in `apps/mobile/locales/{locale}.json` via `expo.locales`. Editing it needs a **rebuilt dev client**, not a Metro reload.
- New keys are `prefix_camelCase` and must be added to **both** catalogs.
- **Every `Intl` date format takes `dateLocale()`** from `shared/i18n` — never a hardcoded tag and never the account's `preferences.locale`, which this client cannot write and which printed English months under a Ukrainian UI. It returns the *device's* full tag (day-first vs month-first is regional, not linguistic) but only while that tag still speaks the app's language. A test stub for `@/shared/i18n` must include it: the format barrel reaches `when`, which asks for it at import time, and a missing export is an import-time crash in an unrelated test file.

## Dates

A stored date is a **calendar day**, written as its UTC midnight by `toIsoDay`
and read back with `timeZone: "UTC"`. Two rules follow, and breaking either is
silent:

- **Never compare a stored date against `Date.now()`.** Reduce now to a day
  first — `todayAsDay()` in `shared/lib/format/day.ts` — and compare day to day.
  Against an instant, "has this day passed" is answered on UTC's clock: today's
  payment left the Home rail at 03:00 in Kyiv, and during the *previous evening*
  west of UTC. `isFutureDay` and `daysUntil` are the other two callers.
- **`todayAsDay` is the DEVICE's day, not the account's `preferredTimezone`.**
  Same choice the reminder planner makes for its firing instants: "has this day
  arrived" is a wall-clock question. The server answers the same question in the
  account's zone for the lifecycle `status` it ships, and the two can differ by a
  day — but never contradictorily, because `deriveAttention` branches on the
  server's `status` before it consults its own clock. `useSeedPreferredTimezone`
  is what stops that gap opening for a new account.

## UI

RN `StyleSheet` only — no Tailwind, no shadcn, no Radix, no styled-components. Tokens come from `@/shared/ui/theme`; the app is **dark-only** (`app.json` pins `userInterfaceStyle: "dark"`). Cap layout-critical text with `maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}`; leave prose uncapped for accessibility.

**Colour means one thing at a time.** `accent` green is brand and interaction, never "money is good" — the sole exception is Home's next-month chip, where it marks a *direction* of change. `danger`/`warning`/`muted` on Home's upcoming rail encode **when** (≤1 day / ≤7 rolling days / later), never what kind of event it is; the kind is carried by an SF Symbol. The one event that opts out is `ends`, which is always green because a cancellation takes money off the bill. Read the comments on the tokens before reusing one.

**`cancelling` is a kind of ACTIVE, not a kind of cancelled.** It still bills
and still gives access until `willBeCancelledAt`, so the list's "active" filter
matches it via `isCurrentlyActiveSubscription` rather than `status === "active"`
— excluding it made a subscription the user is still paying for vanish from the
default list the moment they wound it down. It stays reachable under
`cancelling` too: one subscription, two true answers. The reminder planner and
`subscriptionsDueOn` deliberately keep the strict `=== "active"` test — those
answer "will money move", not "is this still mine".

**A cancelling subscription is asked "when do I lose it", never "when do I pay
next".** `shouldIncludeOccurrence` is a strict `<`, and an end-of-period cancel
sets `willBeCancelledAt` TO the next payment date — so that charge never
happens, and the detail card counting down to it was promising money would move
on the one screen a user opens to confirm it will not. The card reads
`detail_ends` + the cancellation date, and answers the charge question from the
DATES (`chargeBeforeCancellation`, tested): `edit` can push the cancellation
past one or more payments, so "cancelling" alone never proves "no further
charges".

**Status labels name ONE subscription, so they are singular** — the detail hero
and the filter menu share `subs_status_*`, and Ukrainian has no form that covers
both. `cancelling` is "Cancelled" / "Скасовано" (the user cancelled it; it is
still running) and `cancelled` is "Ended" / "Завершено" (the paid period
elapsed); the near-identical Cancelling/Cancelled pair was unreadable at a
glance. **The cadence belongs under the price, not on the status line** — it
qualifies that number, and beside the status it lost a three-way squeeze for one
row and truncated to "· щор…".

**The detail banner's colour is the brand's own favicon, blurred — not an
extracted palette.** `blurRadius` is a core RN `Image` prop, so the tint arrives
with the image: no colour-extraction module, no native rebuild, and no async
step that pops the header a frame after everything else. The **scrim over it is
not decoration**. Most favicons are a mark on an opaque white plate, which blurs
to a near-white field, so without a fixed dark gradient the white text below is
unreadable for a large and unpredictable share of brands.

The banner runs **behind the glass nav bar**, not below it — stopping at the
header left a dark strip above the colour that read as a bug. The ScrollView's
`contentInsetAdjustmentBehavior="automatic"` already places content below the
bar, so the hero climbs back out of that inset with a negative `marginTop` of
`insets.top + 44` and pays the same number back as `paddingTop`, leaving its
content exactly where it was and moving only the artwork. A few points of
overscan go on **both** so no rounding can leave a seam. It is **iOS-only**: the
Android header is opaque (see Native tabs & headers), so there is nothing to
show through and the negative margin would only hide the top of the banner.
`@react-navigation/elements` is not in this tree — there is no `useHeaderHeight`
to ask.

**The banner owns the DATE, the card below owns the COUNTDOWN.** Both used to
print the same date. The banner's line is already worded for the status
(`detail_heroRenews` / `heroEnds` / `heroResumes` / `heroEnded`), so the card
keeps only what the banner cannot say: how long, and how far through the cycle.

**Nothing on the detail screen may restate the banner.** Two things were cut for
this and should not come back: a centred "charged as $7.20" line — the
as-charged amount is now the Amount segment's CAPTION, which previously read
"Amount" and only named the number above it — and the ended-subscription card.
A finished subscription gets no card at all: the banner names the end date, the
price and the status, and everything else about one is unknowable here, because
`createdAt` is when the row was typed into SubEye rather than when the
subscription began. There is no honest lifetime total, no real duration and no
"you saved X". What it gets instead is the one thing still worth doing with it: `EndedEmpty`,
a glyph, one sentence and a Restart button.

**`renew` is two different actions wearing one name, and `allowedActions` cannot
tell them apart** — both wind-down states offer it. That is why
`LifecycleActionTarget` carries `status`. On `cancelling` it is a one-tap undo
labelled "Keep subscription"; the subscription never stopped billing, so its
`paymentDate` must NOT move or a cycle that was never interrupted gets shifted.
On `cancelled` it is "Start again", and it opens a sheet asking WHEN — the user
may have resubscribed weeks ago and only now opened the app, and `paymentDate`
is the anchor every future occurrence is projected from, so renewing silently on
today's date puts every projected payment on the wrong day. The date may be in
the past and may not be in the future: `maximumDate` on the picker makes that
unreachable rather than rejectable, and `pastIsoDateSchema` is the backstop
(compared against the end of the UTC day, so a user ahead of UTC can still pick
their own "today").

**The tab bar is hidden on the detail screen** (`hidden` on `NativeTabs`).
UIKit's own `hidesBottomBarWhenPushed` is not exposed by react-native-screens
and expo-router only offers the flag on the tab HOST, so `(tabs)/_layout.tsx`
works out from `useSegments()` when the screen is showing. Match the PAIR
`subscriptions` + `[id]`, never `[id]` alone: the category editor is also an
`[id]` route, and it is a sheet floating over the tab bar that must keep it. The
pair also keeps the bar hidden while the detail's own pause/pricing sheets sit
on top of it.

**A swiped row must be OPAQUE.** `ReanimatedSwipeable` slides the row over its
revealed actions, so a row that inherits its background from a parent (the
categories group card) shows the action through itself for the whole drag. The
capsule-and-caption reveal also needs vertical room: at 52pt rows the caption
pushes the capsule to within 2pt of the row top, which the group's 24pt corner
radius then clips on the first row — the categories list drops the caption and
centres the capsule, the 64pt subscription rows keep both.

**The subscriptions list is a `SectionList`**, always — the ungrouped case is one section whose header renders `null`, which is cheaper than branching between two list components. Grouping lives in `entities/subscription/model/grouping.ts` (pure, tested); section headers total `billing.preferred.monthly` so a yearly group is comparable to a monthly one. Headers do **not** stick: they are borderless text on the page background, and pinning one would let rows slide through its letters.

**Splash screen.** The `expo-splash-screen` config **must keep its `image`**. The plugin only points the generated storyboard at the `SplashScreenBackground` colorset from the code path that installs the image view — with `backgroundColor` alone the colorset is still written but nothing references it, and the storyboard falls back to `systemBackgroundColor`, which under this app's forced dark mode is pure **black**. That is a black launch screen for the whole JS boot (measured: ~3s in a Release build). `_layout.tsx` holds the splash across that boot and hides it on the root view's first layout.

**App icon.** `icon.icon/` is an Apple **Icon Composer** bundle and is the source of truth — `ios.icon` points straight at it (SDK 54+), so Apple renders the gradient, shadow and translucency. **Android cannot read a `.icon` bundle**, and a `.icon` path on the *root* `icon` key is rejected by `@expo/prebuild-config`, so the two Android PNGs in `assets/` are generated from the same four layer SVGs by `python3 scripts/build-android-icon.py`. **Rerun it after any edit under `icon.icon/Assets/`** or the platforms drift. Native dirs are CNG-generated and gitignored, so an icon change needs `bun run prebuild` + a native rebuild — Metro reload will not show it.

## Environment

`EXPO_PUBLIC_*` vars are inlined by Metro **at bundle time** — changing `.env` needs a Metro **restart**, not a reload. They are validated at module load in `shared/config/env.ts`, which throws loudly on a missing var. On-device dev must point `EXPO_PUBLIC_API_URL` at a device-reachable host (LAN IP or tunnel) — **never `localhost`**, because the request originates on the phone.

Build numbers (`ios.buildNumber` / `android.versionCode`) are **EAS-owned — never hand-edit**. The marketing version is per-profile in `app.config.js`: production uses the hand-set `expo.version` in `app.json`; every other profile uses the fixed `BETA_VERSION` and lets the EAS build number move.

## Testing

`bun run --cwd apps/mobile test` — `bun:test`, there is no vitest anywhere in the repo. **Run it from this workspace, never `bun test apps/mobile/src` from the root**: `bunfig.toml` here preloads `test-preload.ts`, and without it the first transitive `react-native` import aborts the whole file on a Flow parse error. Test **pure logic only** — locale resolution, transport error mapping, view-shaping over DTO fields. Domain derivations are tested in their own package. **No React Native component renders** (no renderer is configured, and it is out of scope). Co-locate tests as `*.test.ts` next to the module.

## Commands

```bash
bun run --cwd apps/mobile i18n:generate   # compile Paraglide (auto-runs before the rest)
bun run --cwd apps/mobile start           # Metro
bun run --cwd apps/mobile ios             # build + run the iOS dev client
bun run --cwd apps/mobile android         # build + run the Android dev client
bun run --cwd apps/mobile prebuild        # regenerate ios/ + android/ from app.json
bun run --cwd apps/mobile type-check
bun run --cwd apps/mobile test
bun run dev:mobile                        # build server types, then start Metro (from root)
bun run check:boundaries                  # includes the mobile FSD rules
```

EAS:
```bash
bunx eas build --profile development --platform ios     # dev client
bunx eas build --profile production --platform all
bunx eas submit --profile production --platform ios
```
