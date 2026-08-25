# @subeye/mobile — Agent Guidelines

`apps/mobile` (`@subeye/mobile`) is the **v4 SubEye client**: an Expo (React Native, expo-router) app that runs entirely on the device — no API, no database, no accounts. It replaces the retired React/Vite web client. Read this before touching mobile code.

**Ten screens. Every addition requires an explicit argument.** The v3 client reached 33,991 hand-written LOC because features were fun to build, not because they were needed. Do not reproduce that here.

The three beyond the original seven, and why: **`settings/notifications`**, because reminder config outgrew a single switch the moment it had a time, several lead times and a health readout — and a status section is the only way a user can tell a silent OS refusal from an app bug. **`subscriptions/due/[date]`**, because a digest notification that names three services has to be able to show exactly those three — and the list cannot do it, because its filters now PERSIST across launches, so whatever the user last narrowed to would silently hide some of them. **`legal/[doc]`**, because Settings and the paywall used to hand the terms and the privacy policy to Safari — an app with no network on its read path sending a user to a website to read what it does with their data, and a reviewer following that link out of the build they are reviewing. One route serves both documents from `@subeye/legal`, so it is one screen rather than two.

## Layers & structure

FSD, four layers, imports flow **downward only**:

```
apps/mobile/src/
  app/                    expo-router routes — thin adapters + _layout providers
  widgets/<name>-page/    page composition (ui/, index.ts)
  entities/<domain>/      domain data + query hooks (api/, model/, index.ts)
  shared/
    config/env.ts         EXPO_PUBLIC_* validation
    lib/                  query client, store (MMKV ports + FX), mmkv, focus
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
- **`_layout.tsx` is the FSD app layer.** The provider chain is short and nothing in it waits on anything:

  ```
  GestureHandlerRootView
    └ SafeAreaProvider           the detail hero reads insets from it
      └ QueryClientProvider      NOT PersistQueryClientProvider — see Data
        └ Stack
  ```

- **Nothing gates the tab tree.** `(tabs)/_layout.tsx` is `return <Tabs />`: there is no session to resolve, and the store paints real numbers off MMKV on the first frame. `ReminderSync`, `WidgetSync` and `DuePhaseSync` therefore run unconditionally, which is the point — they used to be reachable only behind a sign-in.
- `_layout.tsx` does a bare side-effect import — `import "@/shared/lib/focus"` (`AppState` → `focusManager`). **It has no binding — do not let an auto-import cleanup delete it**, or every foreground refetch dies app-wide. There is no `online` counterpart any more: with no network on the read path, `onlineManager` has no source and no query can ever PAUSE.
- **Every layout a deep link can land inside needs an `unstable_settings` anchor.** A deep link builds the stack from the URL alone, so `subeye:///subscriptions/x` — a widget row, a tapped reminder — mounted the detail screen as the *only* route in the subscriptions stack: no back button, and that screen hides the tab bar by design, so the app was a dead end until it was force-quit. The root layout anchors `(tabs)`; `(tabs)/subscriptions/_layout.tsx` anchors `index`. Adding a new deep-linked route means checking the anchor of every layout above it.
- **Sheets are native `formSheet` routes**, the only sheet mechanism in the app: Manage-pricing, Pause, the category editor, the legal sheet, and the list-options sheet that is now **Android's fallback only**. `presentation: "formSheet"` with `sheetGrabberVisible: true`, plus a fixed detent for anything holding a ScrollView (a `flex: 1` scroller has no intrinsic height, so `fitToContents` can measure to nothing). There is **no NiceModal / modal-manager equivalent** — the navigator owns presentation.
- **A sheet is the fallback, not the first answer.** Where UIKit has a control, use the control: the subscriptions list puts sort / group / status / category behind a real **UIMenu** via `unstable_headerLeftItems` / `unstable_headerRightItems` (expo-router's wrapper over `headerLeftBarButtonItems`), and the detail screen does the same for its lifecycle actions. Items take **`label`, not `title`** — expo-router renames the RNScreens field — and submenus are **single-selection by default** (`multiselectable` is false unless set), so UIKit draws the checkmark itself from each action's `state: "on" | "off"`. Set **`multiselectable: true` on the outer `menu`** whenever its children are all submenus: the default sends `UIMenuOptionsSingleSelection` to a menu that owns no selectable actions, which is what the missing checkmarks were traced to. UIKit gives a submenu **no subtitle, no value slot and no per-item tint**, so a submenu announces itself two ways and only when it is off its default: the **filled variant of its own SF Symbol**, and the chosen value appended to the label (`"Status · Paused"`). A submenu at rest stays a plain glyph and a bare noun — spelling out every default made the top level four sentences long, and the defaults are the longest strings in their own lists. A submenu has **no `disabled`** field, so an empty submenu has to be omitted from the array rather than greyed out. expo-router only swaps native items in **on iOS**, so a screen that uses them keeps its `headerLeft`/`headerRight` Pressables as the Android path — and anything added to the menu must be added to Android's sheet too, or the feature silently does not exist there.
- **Add/Edit is the exception: a `presentation: "modal"` route that owns its own `Stack`** (`app/subscription-form/`). It lives at the **root**, beside `paywall`, and not under `(tabs)/subscriptions` — four surfaces open it (Home's `+`, the list's `+`, Home's empty state, the detail screen's Edit) and two of them are in a different tab from the list. Nested under the list's stack it was a cross-tab push: expo-router switched tabs and presented the modal in one commit, so the tab visibly changed underneath and the slide-up animation was swallowed by the switch. **Any route reachable from more than one tab belongs at the root for the same reason.** It was a formSheet pinned at a 0.9 detent — a modal's footprint without a modal's navigation — which forced the category picker into an ActionSheet with no search and no create. A sheet cannot push a sub-screen without stacking a second sheet on itself. Anything that outgrows an action sheet becomes a pushed screen in that nested stack; the form's draft lives in a React **context** on its layout (`widgets/subscription-form/model/form-context.tsx`), NOT a module store — a half-typed subscription must die with the modal.
- **Search fields spread `nativeSearchBarChrome`** from `@/shared/ui/header` into `headerSearchBarOptions` — three screens carry one (the list, the category picker, the brand picker) and all three need the same settings. `placement: "stacked"` + `hideWhenScrolling: false` is a real `UISearchBar` pinned under the nav bar, glass header and all. Not `placement: "automatic"`: UIKit picks a field that retracts on the first scroll, so on a list long enough to want searching the control is gone exactly when it is wanted. If it ever appears not to render, suspect a stale Fast Refresh before concluding the platform cannot do it: a full relaunch was the difference here, and a hand-rolled `TextInput` lookalike was very nearly shipped over it.
- **`barTintColor` in that chrome is a FIX, not styling — do not "simplify" it away.** It sets `searchTextField.backgroundColor`; unset, the field keeps UIKit's translucent light fill, which reads dark-grey over the near-black app and blows out to a near-**white pill** for ~200ms every time its screen returns to the top of the stack. Measured on the list, returning from a subscription: the band around the field peaked at 0.47 luminance against a resting 0.11, for 12 frames at 60fps. An opaque fill has nothing to sample and cannot flash. An older comment claimed a custom `barTintColor` renders the magnifier glyph black — it does not on react-native-screens 4.25, verified on iOS 26.
- **`hideWhenScrolling: false` — the field is pinned, and the platform's pull-down-to-reveal (`true`) was tried and reverted.** It reads well and removes the placeholder flash below for free, because nothing is rendered to repaint. But the reveal needs the content to out-measure the screen, and a list shorter than that has no scroll range at all — with one subscription the field was unreachable. Buying the range with a height floor on the content container makes a short list scrollable into blank space, and **`flexGrow: 1` is worse still**: it did that to a FULL list. `grow` therefore stays conditional on the list being empty, where it only lets the empty state centre itself.
- **The list's search field is declared on the LAYOUT's `<Stack.Screen name="index">`, not on the page.** Options set from inside a screen component go through `navigation.setOptions` in an effect whose deps include `isFocused`, so they are re-pushed on every focus change and every re-render, rebuilding the whole navigation item each time. The filter menu has to live there because it depends on screen state; the search field never did. (This alone did **not** fix the white flash above — `barTintColor` did — but it stops the app rebuilding a `UISearchController` on every repaint.)
- **A sheet's commit action goes in its nav bar, not under its content.** The category editor is the one sheet that keeps `headerShown` — save and delete were buttons beneath a 120-tile emoji grid, which is below the fold of a 0.9 detent, so committing a typed name meant scrolling past every emoji first. It spreads `nativeHeaderChrome` like any headered screen and fills the bar from `CategorySheet` (`unstable_headerLeftItems` = delete, `unstable_headerRightItems` = save, plus the Android Pressables). Any sheet whose content can outgrow the detent should do the same.
- **The legal sheet is a ROOT route** (`app/legal/[doc].tsx`), for the same reason
  the paywall is one and then a further one: the paywall is itself a root screen,
  so a sheet pushed from under its Restore button has to be a sibling to land ON
  it rather than behind it. Two traps came out of building it, both silent.
  **`headerShown` must be set explicitly** — the root `Stack`'s `screenOptions`
  turn headers off, and spreading `nativeHeaderChrome` only *styles* a header, it
  does not enable one; the sheet shipped titleless until this was noticed. And
  **`router.setParams` does not move a dynamic path segment**: the terms link to
  the policy, and `setParams({ doc })` looked like the light way to swap them but
  left the sheet rendering the old document with no error anywhere. `replace` is
  the call — it re-presents nothing, the sheet stays at its detent, and the new
  screen mounts scrolled to the top.
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

## Data

- **There is no transport.** Every read and write goes through `@subeye/store`'s use-cases over the MMKV ports in `shared/lib/store`. A use-case reports a caller error by putting a 4xx `status` on the thrown error, which is the shape `shared/lib/query.ts` filters on before reporting to Sentry.
- **The only outbound requests left are third-party, and none of them is on the read path**: the FX rate CDN (`shared/lib/store/fx.ts`), Brandfetch search and the Google favicon fallback (`shared/ui/brand-logo.tsx`, `widgets/subscription-form/model/brand-search.ts`), plus Sentry and RevenueCat. Adding anything else means adding a network dependency to an app that has none.
- **iCloud sync is the one path that sends the USER'S OWN data anywhere** (`shared/lib/store/cloud.ts`, native module in `modules/icloud-kv/`). It is off by default, free rather than Pro, and lives behind a switch in Settings → Data. It is **not** a backup feature: MMKV is already in `Documents` and therefore already in device backup, which is what covers a lost phone — what this buys is a *second device*. Say that in any copy you write, or a user reads the switch as backup and turns it off.
  - **One key per record, never one document key.** `NSUbiquitousKeyValueStore` resolves conflicts per key, last writer wins, so a record per key means two devices editing two different subscriptions both keep their edit and there is no merge to write. A single blob would make every concurrent edit a whole-store conflict. That mapping is pure and tested in `shared/lib/store/cloud-keys.ts`.
  - **Apply the CHANGED KEYS, never a whole snapshot.** The notification names exactly what moved. Rebuilding the document from a full snapshot is shorter and deletes every record this device has not pushed yet — i.e. everything created while it was offline or unlinked.
  - **A deletion is an absent key**, so there are no tombstones and nothing to prune. A subscription delete does *not* cascade to phases on the receiving side: the sending device removed both keys, and cascading again would delete phases whose subscription simply has not arrived yet.
  - **Switching the toggle on is a MERGE**, both directions. Either "cloud wins" or "device wins" loses somebody's data — a fresh install would wipe the cloud, a week-offline device would lose its week.
  - **Erase has to reach iCloud**, which is why `eraseAll` calls `clearCloud()` *before* `eraseDoc()`. Leave the keys and the next reconcile pulls the whole erased document straight back.
  - **1024 keys / 1 MB, enforced by iOS by dropping the overflowing write.** `CLOUD_KEY_BUDGET` stops short of that and reports instead, so sync fails loudly rather than going silently partial.
  - **The entitlement is not enough — the App ID needs the iCloud capability, enabled BY HAND.** `com.apple.developer.ubiquity-kvstore-identifier` is in `app.json`, but `cc.subeye.app` must also have **iCloud** enabled on the Apple Developer portal, exactly like App Groups; Apple issues no profile for an unregistered capability and the build dies in "Planning build". EAS will never do this for you: `EXPO_NO_CAPABILITY_SYNC=1` is permanent for this app (see [docs/release/MANUAL-CHECKLIST.md](../../docs/release/MANUAL-CHECKLIST.md)), so **any new entitlement is a manual portal step**. And enabling it is only half — Xcode keeps signing with the profile it already cached, so the local profile must be deleted before it takes effect. With no iCloud account signed in the store also accepts every write and silently drops it, which is what `cloudSyncAvailable()` exists to catch.
- **THE STORE IS THE CACHE. There is no Query persister** — no `PersistQueryClientProvider`, no `persistQueryClientSubscribe`, no dehydrated blob, no `buster`. `shared/lib/store` reads one JSON document out of MMKV synchronously, so the numbers are simply already there; Query is an in-memory view over it with `staleTime: 0` and no `retry`. **Do not reintroduce a persister** — it would be a second, staler copy of a store that is already on disk, and its `isRestoring` gate pauses every query until the restore resolves.
- **Writes are not optimistic, deliberately.** A local write has no latency window to be optimistic in: mutate, then `invalidateSubscriptionData` (`entities/subscription/api/invalidate.ts`), which covers the list, every detail entry, and BOTH analytics keys — the monthly summary is `["analytics", …]` and does not share the dashboard's root.
- **There is no pull-to-refresh.** Revalidation is invisible: `shared/lib/focus.ts` wires `AppState` into TanStack's `focusManager`, so returning to the app refetches everything stale (>5 min) behind the cached screen. RN has no `visibilitychange`, so **without that bridge `refetchOnWindowFocus` silently does nothing** — which is why a `RefreshControl` used to be load-bearing. Do not add one back.
- **MMKV is v4 (Nitro):** instantiate via `createMMKV()`, **not** `new MMKV()` (which throws on v4).

## Native modules

`modules/icloud-kv/` is the app's only local Expo module — Swift over
`NSUbiquitousKeyValueStore`. Autolinking finds it through
`expo.autolinking.nativeModulesDir` in `package.json`; **that key is what makes
it exist**, there is no implicit default, and without it the module vanishes with
no error anywhere.

- The JS side calls `requireOptionalNativeModule`, **not** `requireNativeModule`.
  The module is Apple-only and is absent on Android and under `bun test`, and
  every caller already handles "iCloud is unavailable" — making a missing native
  side an import-time throw would take the whole store down with it.
- Editing anything under `modules/` needs `bun run --cwd apps/mobile prebuild`
  plus a native rebuild. Metro reload will not pick it up.

## Crash reporting (Sentry)

`shared/lib/sentry.ts` owns `Sentry.init` and is the only file that imports
`@sentry/react-native` outside `_layout.tsx`. Everything else reports through
`reportError`. Org **`pe-yhunko`**, project **`subeye`**,
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
- **An event carries no identity at all.** There is no account, so there is no
  id to attach — and never an email, a subscription name, an amount or a note.
- **`@sentry/react-native` is stubbed in `test-preload.ts`.** It reaches
  `react-native/Libraries/TurboModule/...`, past the `react-native` stub, so any
  test that transitively imports the query client dies on a Flow parse error
  without it.

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
- **A REPEATING trigger reads back with the components it recurs over MISSING** —
  no `year` at all, and no `month` for a `MONTHLY` one — so it has no instant to
  read and `trigger-time.ts` computes the next match instead. Android is a third
  set of conventions again: the components sit at the TOP level rather than under
  `dateComponents`, and `month` comes back 0-based there against iOS's 1-based.
  Both are tested against the real shapes. `repeatsForever` is what lets the
  status section stop reading a pending count as a countdown — see the two-mode
  model in [packages/reminders/CLAUDE.md](../../packages/reminders/CLAUDE.md).
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
`subscriptionsDueOn` answer "will money move" rather than "is this still mine",
and that is the SAME test plus a date: `isCurrentlyActiveSubscription` and then
`shouldIncludeOccurrence` per occurrence. A strict `=== "active"` there dropped
every charge between now and a cancellation set months out — silently, with no
server to fall back on.

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

**The banner also reaches ~420pt ABOVE the screen** (`OVERSCROLL_REACH`), because
the hero scrolls with the content: a rubber-band pull drags it down and exposes
whatever is above it, which is the same dark seam produced by a gesture instead
of by rounding. Extending the artwork is cheaper than an animated stretchy
header — no scroll handler, nothing per frame. The scrim is **two layers** for
this: the gradient's stops are percentages, so stretching one scrim over the
taller box slides them down and leaves the visible band sitting in the dark end
of the ramp. The reach gets a flat scrim at exactly the gradient's 0% value
(`rgba(15,17,21,0.40)`), which makes the join invisible and leaves the gradient
the geometry it was tuned for.

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

`EXPO_PUBLIC_*` vars are inlined by Metro **at bundle time** — changing `.env` needs a Metro **restart**, not a reload. They are validated at module load in `shared/config/env.ts`, which throws loudly on a missing var, and `test-preload.ts` carries a floor for each **required** one. `EXPO_PUBLIC_REVENUECAT_IOS_KEY` is the only required var; Sentry and Brandfetch are optional by design and the comments on them say why. A floor for a var that no longer exists is the same trap in reverse — keep the two lists equal.

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
