# @subeye/mobile — Agent Guidelines

`apps/mobile` (`@subeye/mobile`) is the **v4 SubEye client**: an Expo (React Native, expo-router) app that runs entirely on the device — no API, no database, no accounts. It replaces the retired React/Vite web client. Read this before touching mobile code.

**Twelve shipped screens. Every addition requires an explicit argument.** The v3 client reached 33,991 hand-written LOC because features were fun to build, not because they were needed. Do not reproduce that here.

The three beyond the original seven, and why: **`settings/notifications`**, because reminder config outgrew a single switch the moment it had a time, several lead times and a health readout — and a status section is the only way a user can tell a silent OS refusal from an app bug. **`subscriptions/due/[date]`**, because a digest notification that names three services has to be able to show exactly those three — and the list cannot do it, because its filters now PERSIST across launches, so whatever the user last narrowed to would silently hide some of them. **`legal/[doc]`**, because Settings and the paywall used to hand the terms and the privacy policy to Safari — an app with no network on its read path sending a user to a website to read what it does with their data, and a reviewer following that link out of the build they are reviewing. One route serves both documents from `@subeye/legal`, so it is one screen rather than two.

The eleventh is the **currency picker**, and it is one screen doing two jobs — Settings → Currency *and* the price field's currency, wired by each stack's own route the way `categories-page` is. It exists because the catalogue went from five hard-coded codes to the whole ISO-4217 fiat set (156), and an `ActionSheetIOS` stops being a list somewhere around a dozen rows: no search, no grouping, no flags. Adding currencies without it would have been the regression.

The twelfth is **`calendar/year`**, and it is the only screen in the app that is Pro OUTRIGHT rather than a Pro row inside a free one. That is the whole argument for it: the calendar tab used to truncate its own agenda behind a lock, and the lock withheld nothing — the grid above it already printed each day's logos and total, and the agenda listed every one of them for a free install. A gate a user routes around in one tap does not convert, it teaches them the locks are theatre. So the month screen gives everything away and Pro is additive instead: the year heatmap here, plus the month-over-month delta and the heavy-day flag on the month itself. It is also the one thing the month pager genuinely cannot do — twelve months at a time, off ONE walk over the year (`buildCalendarYear`), where twelve `buildCalendarMonth` calls would re-read and re-parse the subscription list twelve times.

The thirteenth route, **`settings/developer`**, is not one of them and never counts against that number: it renders nothing in a release build. See the dev-route rule under Routing before adding to it.

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
- **A dev-only screen reaches its widget through `__DEV__ ? require(…) : () => null`, never a static import** (`app/(tabs)/settings/developer.tsx` → `widgets/developer-page`). Metro inlines `__DEV__` and folds the dead branch *before* it collects dependencies, so the widget is never bundled for release; a static import is hoisted and ships the whole thing, and so do `import()` and `lazy()`. The route FILE always ships — anything in `src/app/` is a route — which is why it holds nothing but the stub. Its **copy is hardcoded English**: a Paraglide key lands in `shared/i18n/paraglide/messages`, which the barrel re-exports as a namespace and Metro does not tree-shake, so the string would ship in both locales even though the screen does not. Dev tooling is not translated. Anything a dev tool needs from shipped code goes behind `__DEV__` at the *use* site (`fetchProPackage`'s `globalThis.__devPaywall` branch) rather than behind a new export, which would leave a binding in the bundle. Verify a change with a production export and `strings -a <bundle>.hbc | grep -cF` — plain `grep` on Hermes bytecode matches nothing and every check looks like it passed, so always confirm the method on a string you know IS shipped.
- **`_layout.tsx` is the FSD app layer.** The provider chain is short and nothing in it waits on anything:

  ```
  GestureHandlerRootView
    └ SafeAreaProvider           the detail hero reads insets from it
      └ QueryClientProvider      NOT PersistQueryClientProvider — see Data
        └ Stack
  ```

- **Nothing gates the tab tree.** `(tabs)/_layout.tsx` is `return <Tabs />`: there is no session to resolve, and the store paints real numbers off MMKV on the first frame. `ReminderSync`, `WidgetSync` and `DuePhaseSync` therefore run unconditionally, which is the point — they used to be reachable only behind a sign-in.
- `_layout.tsx` does a bare side-effect import — `import "@/shared/lib/focus"` (`AppState` → `focusManager`). **It has no binding — do not let an auto-import cleanup delete it**, or every foreground refetch dies app-wide. There is no `online` counterpart any more: with no network on the read path, `onlineManager` has no source and no query can ever PAUSE.
- **Every layout a deep link can land inside needs an `unstable_settings` anchor.** A deep link builds the stack from the URL alone, so a route mounted with nothing under it has no back button and no way out — `subeye:///subscriptions/x` (a widget row, a tapped reminder) was a dead end until the app was force-quit. The root layout anchors `(tabs)`, which is what puts the tab tree under a deep-linked subscription; `(tabs)/subscriptions/_layout.tsx` anchors `index`, which puts the list under a deep-linked due digest. Adding a new deep-linked route means checking the anchor of every layout above it.
- **Sheets are native `formSheet` routes**, the only sheet mechanism in the app: Manage-pricing, Pause, the category editor, the legal sheet, and the list-options sheet that is now **Android's fallback only**. All of them spread `nativeSheetChrome` from `@/shared/ui/header` — `presentation: "formSheet"`, `sheetGrabberVisible: true` and a FIXED 0.9 detent, because a `flex: 1` scroller has no intrinsic height and `fitToContents` can measure it to nothing. Only a sheet that cannot overflow (the pause date field) overrides the detent. There is **no NiceModal / modal-manager equivalent** — the navigator owns presentation.
- **A sheet is the fallback, not the first answer.** Where UIKit has a control, use the control: the subscriptions list puts sort / group / status / category behind a real **UIMenu** via `unstable_headerLeftItems` / `unstable_headerRightItems` (expo-router's wrapper over `headerLeftBarButtonItems`), and the detail screen does the same for its lifecycle actions. Items take **`label`, not `title`** — expo-router renames the RNScreens field — and submenus are **single-selection by default** (`multiselectable` is false unless set), so UIKit draws the checkmark itself from each action's `state: "on" | "off"`. Set **`multiselectable: true` on the outer `menu`** whenever its children are all submenus: the default sends `UIMenuOptionsSingleSelection` to a menu that owns no selectable actions, which is what the missing checkmarks were traced to. UIKit gives a submenu **no subtitle, no value slot and no per-item tint**, so a submenu announces itself two ways and only when it is off its default: the **filled variant of its own SF Symbol**, and the chosen value appended to the label (`"Status · Paused"`). A submenu at rest stays a plain glyph and a bare noun — spelling out every default made the top level four sentences long, and the defaults are the longest strings in their own lists. A submenu has **no `disabled`** field, so an empty submenu has to be omitted from the array rather than greyed out. expo-router only swaps native items in **on iOS**, so a screen that uses them keeps its `headerLeft`/`headerRight` Pressables as the Android path — and anything added to the menu must be added to Android's sheet too, or the feature silently does not exist there.
- **Add/Edit is the exception: a `presentation: "modal"` route that owns its own `Stack`** (`app/subscription-form/`). It lives at the **root**, beside `paywall`, and not under `(tabs)/subscriptions` — four surfaces open it (Home's `+`, the list's `+`, Home's empty state, the detail screen's Edit) and two of them are in a different tab from the list. Nested under the list's stack it was a cross-tab push: expo-router switched tabs and presented the modal in one commit, so the tab visibly changed underneath and the slide-up animation was swallowed by the switch. **Any route reachable from more than one tab belongs at the root for the same reason** — which is also where a subscription's own screen and its three sheets live (`app/subscriptions/[id]/`), reached from the list, the calendar, the due digest, a widget row and a reminder. It was a formSheet pinned at a 0.9 detent — a modal's footprint without a modal's navigation — which forced the category picker into an ActionSheet with no search and no create. A sheet cannot push a sub-screen without stacking a second sheet on itself. Anything that outgrows an action sheet becomes a pushed screen in that nested stack; the form's draft lives in a React **context** on its layout (`widgets/subscription-form/model/form-context.tsx`), NOT a module store — a half-typed subscription must die with the modal.
- **The categories list is ONE screen doing two jobs**, and adding a second one is the mistake it was built to undo. `widgets/categories-page` is Settings → Categories *and* the subscription form's category step: without a `pick` prop a row opens the editor and swipes to delete; with one a row selects and pops, and a leading "None" row appears. Both create through the same `CategorySheet`, whose optional `onCreated` is what lets the form apply the new category and drop back to the form instead of to the list. The two live in different stacks, so **the app layer wires them** (`app/subscription-form/category/index.tsx`) — a widget importing a sibling widget is the one edge FSD has no room for, and the form's draft context is something only a route inside that layout can read. The return is **`router.dismiss(2)`, never `dismissAll()`**: the picker is pushed from the edit form AND from step two of the create flow, so the stack beneath it is not always one deep.
- **Screen chrome that depends on nothing the screen holds belongs on the LAYOUT** — titles, the categories `+` (`categoryAddHeaderOptions`), and every search field. Options declared inside a screen component go through `navigation.setOptions` in an effect that re-runs on every render, rebuilding the whole navigation item; for a search field that is one `UISearchController` rebuild per keystroke. That is why the category picker's query lives in a module store (`categorySearch`) read with `useSyncExternalStore` rather than in the page's `useState`, and why it clears on unmount — the native field comes back empty, so a surviving term would filter the list with nothing on screen to explain it.
- **Search fields spread `nativeSearchBarChrome`** from `@/shared/ui/header` into `headerSearchBarOptions` — four screens carry one (the list, the category picker, the brand picker, the currency picker) and all four need the same settings. `placement: "stacked"` + `hideWhenScrolling: false` is a real `UISearchBar` pinned under the nav bar, glass header and all. Not `placement: "automatic"`: UIKit picks a field that retracts on the first scroll, so on a list long enough to want searching the control is gone exactly when it is wanted. If it ever appears not to render, suspect a stale Fast Refresh before concluding the platform cannot do it: a full relaunch was the difference here, and a hand-rolled `TextInput` lookalike was very nearly shipped over it.
- **`barTintColor` in that chrome is a FIX, not styling — do not "simplify" it away.** It sets `searchTextField.backgroundColor`; unset, the field keeps UIKit's translucent light fill, which reads dark-grey over the near-black app and blows out to a near-**white pill** for ~200ms every time its screen returns to the top of the stack. Measured on the list, returning from a subscription: the band around the field peaked at 0.47 luminance against a resting 0.11, for 12 frames at 60fps. An opaque fill has nothing to sample and cannot flash. An older comment claimed a custom `barTintColor` renders the magnifier glyph black — it does not on react-native-screens 4.25, verified on iOS 26.
- **`hideWhenScrolling: false` — the field is pinned, and the platform's pull-down-to-reveal (`true`) was tried and reverted.** It reads well and removes the placeholder flash below for free, because nothing is rendered to repaint. But the reveal needs the content to out-measure the screen, and a list shorter than that has no scroll range at all — with one subscription the field was unreachable. Buying the range with a height floor on the content container makes a short list scrollable into blank space, and **`flexGrow: 1` is worse still**: it did that to a FULL list. `grow` therefore stays conditional on the list being empty, where it only lets the empty state centre itself.
- **The list's search field is declared on the LAYOUT's `<Stack.Screen name="index">`, not on the page.** Options set from inside a screen component go through `navigation.setOptions` in an effect whose deps include `isFocused`, so they are re-pushed on every focus change and every re-render, rebuilding the whole navigation item each time. The filter menu has to live there because it depends on screen state; the search field never did. (This alone did **not** fix the white flash above — `barTintColor` did — but it stops the app rebuilding a `UISearchController` on every repaint.)
- **A sheet's commit action goes in its nav bar, not under its content.** The category editor is the one sheet that keeps `headerShown` — save and delete were buttons beneath a 120-tile emoji grid, which is below the fold of a 0.9 detent, so committing a typed name meant scrolling past every emoji first. It spreads **`categorySheetChrome`** from `@/shared/ui/header` — `nativeSheetChrome` + `nativeHeaderChrome` + an explicit `headerShown: true`, because the sheet chrome turns headers off and spreading the header chrome only *styles* one — and fills the bar from `CategorySheet` (`unstable_headerLeftItems` = delete, `unstable_headerRightItems` = save, plus the Android Pressables). That chrome is shared because **two stacks present this sheet**: Settings creates and edits through it, and the subscription form creates through it. Any sheet whose content can outgrow the detent should do the same.
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

- **iOS uses the scene-based lifecycle.** `plugins/with-ios-scene-lifecycle.js` adds the `UIApplicationSceneManifest`, makes the generated `AppDelegate` conform to `ExpoReactNativeFactoryProvider`, and leaves window creation to Expo's `EXExpoAppSceneDelegate`. Apple makes this mandatory for apps linked with the iOS 27 SDK. The native `ios/` directory is generated and ignored, so this belongs in the config plugin; never patch `AppDelegate.swift` or `Info.plist` by hand.
- **Tab bar:** `<NativeTabs minimizeBehavior="never">` from `expo-router/unstable-native-tabs` — Liquid Glass on iOS 26+, Material 3 on Android. Four triggers: `(home)`, `subscriptions`, `calendar`, `settings`. Keep the native host pinned to the app's dark color scheme and explicit tab colors. Do not restore scroll minimization: on iOS 27 the expanded floating state can remain over list content after navigation transitions.
- **ALPHA CONSTRAINT:** triggers must be **static**. Do not map an array into `<NativeTabs.Trigger>`, do not conditionally render one, do not compute `name`. Icons use two platform props — `sf` (iOS SF Symbol name) and `md` (Android Material Symbols name); there is no cross-platform icon component.
- **Tabs need a nested `Stack` per tab to get a header.** `NativeTabs` children are bare screens with no navigator, so `<Stack.Screen options>` is inert on them. Each tab is a folder with `_layout.tsx` (a `Stack` carrying `nativeHeaderChrome`) plus `index.tsx`.
- **Header chrome comes from `@/shared/ui/header`** (`nativeHeaderChrome`), spread into every headered screen. It is a THREE-way branch, not two. **iOS 26** gets `headerTransparent: true` + `scrollEdgeEffects: { top: "soft" }`. **Android gets an OPAQUE bar** — glass is iOS-only there, and a transparent header leaves scroll content stacked *under* the bar because `scrollEdgeEffects` and `contentInsetAdjustmentBehavior` are both iOS no-ops.
- **iOS BEFORE 26 gets `headerBlurEffect: "systemChromeMaterialDark"`, and that is not optional.** `scrollEdgeEffects` is an iOS 26 API that older versions ignore in silence, so `headerTransparent` alone leaves the bar a hole: nothing fades what passes under it and rows scroll through the title and the status bar at full opacity. The deployment target is **16.4**, so this is every phone that never got 26 — the iPhone 13 mini among them, which is where it was reported. Verify it on an **iOS 18 simulator**; the iOS 26 one cannot show the bug, and Fast Refresh will not show the fix (blur, like `scrollEdgeEffects`, is sticky — cold-launch to judge either).
- **Never** set `headerStyle.backgroundColor` or `headerBlurEffect` on iOS **26**: a solid background kills the glass, and `headerBlurEffect` paints a permanent gray band over the near-black app while overlapping `scrollEdgeEffects`. That rule is about the glass, so it stops applying exactly where the glass does.
- **Every scroll view under a header** sets `contentInsetAdjustmentBehavior="automatic"` and keeps `contentContainerStyle.paddingBottom` small (~24) — the automatic inset already clears the floating tab bar. Do not swap it for a manual `useSafeAreaInsets` padding.
- **`scrollEdgeEffects` only blurs content passing under HEADER ITEMS.** Home shipped `headerShown: false` and therefore had nothing behind its status bar — cards slid up into bare pixels. It has a header again, and the two things in it are the argument for it: the **current month**, which every figure on the screen is scoped to and which the hero never names, and the **same `+` bar button the subscriptions list carries**, on the trailing side. A header repeating the tab's own word is still not worth the fold. The month is `headerLargeTitle`, which is what makes it the page's own heading rather than a caption — UIKit draws it large and flush left and collapses it on the first scroll, so nothing here animates a hero title by hand. It needs the page's scroll view to keep `contentInsetAdjustmentBehavior="automatic"`; the loading, error and first-run branches have no scroll view and simply keep the title expanded, which is correct — there is nothing to scroll.
- **A nested horizontal ScrollView sets `automaticallyAdjustContentInsets={false}`** (Home's month strip). Without it the inner scroller inherits the outer one's automatic inset and starts pushed in by the status-bar height.

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
- **A day count reads the STORED date in UTC and TODAY on the device's clock.**
  The rule is stated once, in `src/shared/lib/format/day.ts`, and every surface
  follows it: a payment date is a calendar day written as its UTC midnight, so
  decoding it uses UTC (`formatDate` pins `timeZone: "UTC"`, `planReminders`
  walks `getUTC*`) — but "which day is it now" is a wall-clock question and is
  answered where the user physically is (`todayAsDay` re-anchors the DEVICE's
  y/m/d through `Date.UTC`, and `leadDaysOf` does the same). `WidgetItem.today`
  is the Swift half of that, and `utcCalendar` is only for the stored side.
  Asking UTC for both — which the widget did — made it the one surface on a
  different calendar between local midnight and UTC midnight: three hours a
  night in Kyiv, where Home's rail read "Renews Tomorrow" and the widget beside
  it read "in 2 days" for the same charge. **The timeline refresh moves with
  it** — `.after` the device's midnight, because that is when the wording
  changes. `daysUntil`'s Kyiv case in `shared/lib/format/when.test.ts` pins the
  JS half; the extension has no test harness, so this paragraph is the Swift
  half's only guard.
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
- **There is no `expo.locales` map, and re-adding one needs platform scoping.** Every *top-level* key of a locale JSON is written to both `{locale}.lproj/InfoPlist.strings` and Android's `values-b+{locale}/strings.xml` — so an iOS-only key such as `CFBundleDisplayName` becomes an Android translation with no entry in the default `values/strings.xml`, and `lintVitalRelease` fails the release build on `ExtraTranslation`. Nest per platform (`{"ios": {…}, "android": {…}}`) instead. The map held only `CFBundleDisplayName: "SubEye"`, which duplicates `expo.name` and silently **overrode** the suffixed name `app.config.js` builds for `SUBEYE_BUNDLE_SUFFIX`, so it was deleted. `CFBundleLocalizations`, `locales_config.xml` and `resourceConfigurations` come from the `expo-localization` plugin's `supportedLocales` and never came from here. Native OS copy still needs a **rebuilt dev client**, not a Metro reload.
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
  day — but never contradictorily, because every surface that dates an event
  branches on the record's own `status` before it consults a clock:
  `buildCalendarMonth` drops a cancelled subscription outright, and
  `subscriptionsDueOn` and the reminder planner both test
  `isCurrentlyActiveSubscription` first.

## UI

RN `StyleSheet` only — no Tailwind, no shadcn, no Radix, no styled-components. Tokens come from `@/shared/ui/theme`; the app is **dark-only** (`app.json` pins `userInterfaceStyle: "dark"`).

**Forms are grouped rows, sheets are labelled boxes.** `shared/ui/field.tsx`
carries both shapes and the doc comment at its top says which is which:
`FormSection`/`FormRow`/`TextRow`/`ValueRow` put the label LEFT and the control
right inside `list-row`'s inset-grouped card — that is the subscription form,
where a dozen short answers each in a full-width box made a four-digit price as
wide as the screen. `Field` keeps the label ABOVE a full-width control, which is
the shape for pause, renew and manage-pricing: one or two questions with a
sentence of context, and a sentence needs the width.

**`@expo/ui/swift-ui` is available and already compiled in.** `expo-router`
depends on it, so `ExpoUI` is in `ios/Podfile.lock` and using it costs no
rebuild — that is what the cadence control (a real `UIMenu` with
`Picker(.inline)` inside it for the checkmarks) and the custom-cadence wheels
(`Picker(.wheel)` — real `UIPickerView`s) are built from. Reach for it before hand-rolling a control
out of `ScrollView` and `snapToInterval`, which is what those two replaced.

**A `Host` HAS NO SIZE OF ITS OWN, so never size one to its own content.** It
either measures that content and reports the size back through shadow-node state
— a ROUND TRIP — or it takes a frame from Yoga, and only the second is safe.
Measured, a longer value drew clipped until the trip landed and then popped into
place (measuring the height alone did not help — a stale frame clips both ways);
given a frame guessed from a font size, a guess one point short clips forever.
The cadence label lost three revisions to that.

**The frame must come from the ROW, not from the value.** That is the part those
revisions missed — not hosting the text, but sizing the host to it.
`widgets/subscription-form/ui/cadence-picker.ios.tsx` takes `FormRow`'s own
control slot for width (free space every control in the card already gets, and
wider than any cadence in any locale, so a longer value grows leftwards into
slack) and a `fontScale` FLOOR for height, because `rowControl` is sized BY its
children and asking to stretch inside it is circular. A floor cannot clip. The
wheels take a frame the same way.

**Given a real frame, the control draws its own text — and the split does not
work.** Anchoring the menu to a transparent `Rectangle` laid OVER an RN label
broke on iOS 26 for a reason no styling reaches: the system MORPHS a menu out of
its anchor and contracts it back on dismiss, so the glass played across text
that never took part in it. The value changed, then a ghost wobbled over it.
`buttonStyle` does not touch that; it is the presentation, not the chrome.

**A hosted select builds its own label — `Picker(.menu)` will not reach the
value column.** The `.menu` style is the shorter spelling and it morphs
correctly, but it holds its value ~13pt in from its trailing edge and `@expo/ui`
exposes no `menuIndicator` or `contentMargins` to take it back, so it was the
one control in the card that could not sit where every other value sits. A
`Menu` with a hand-built `HStack` label owns that edge instead. **THE NEXT
SELECT COPIES THIS, INCLUDING THE TYPE**: `buttonStyle("plain")` so no chrome
insets the label, `frame` with the row's slot and `alignment` flipped to
`leading` under `useLargeText`, `font({ size: 16 * fontScale })` because a
SwiftUI `textStyle` only offers Apple's sizes and `body` is 17 — a point off
every label in the card — and the same 12pt semibold `chevron.up.chevron.down`
in `colors.muted` that the currency chip wears. Values are `colors.text`, never
the accent: a row that CHANGES a value where it stands reads as primary, and
`colors.muted` is for a detail you are only being shown.

**Its components call `requireNativeView` at MODULE SCOPE**, so importing one on
Android throws before a `Platform.OS` branch could run. That is why
`widgets/subscription-form/ui/cadence-picker.ios.tsx` exists beside
`cadence-picker.tsx` — Metro drops a `.ios.tsx` from the Android bundle, which a
runtime branch cannot. It is the **only** platform-suffixed pair in the app, and
the cost is that TypeScript resolves the import to the unsuffixed file: the iOS
one is checked only against itself, so the two signatures drift silently. Prefer
a runtime `Platform.OS` branch (`native-date-field.tsx`, `step-chrome.tsx`,
`subscription-form-page.tsx`) unless the import itself is what breaks.

**Never cap text.** `maxFontSizeMultiplier` is what fails Apple's Larger Text
criterion, and the Accessibility Nutrition Label claims it — Dynamic Type runs to
the largest accessibility size on every screen. The container is what gives, not
the text:

- **Padding + `minHeight`, never a fixed `height`,** on any box that holds text.
  A `height` is what forces the cap.
- **`useLargeText()`** (`@/shared/ui/use-large-text`) is true at iOS's
  accessibility sizes. Rows that pair a label with a value beside it switch to a
  column there — beside each other, neither fits at any phone width, and
  shrinking one into an ellipsis is the failure the criterion is about. It is
  also where a `borderRadius: 999` capsule becomes a rounded rect: the arc of a
  circle crops the second line of a wrapped label.
- **`useShrinkFloor(size, floor)`** is the `minimumFontScale` for the two or
  three headline figures that keep `adjustsFontSizeToFit`. A fixed fraction
  climbs with Dynamic Type until the figure hits its floor and truncates; this
  pins the floor to a point size.
- **`flexGrow`/`flexShrink`/`flexBasis`, not `flex: 1`,** on anything a
  `*Stacked` style has to re-flex. `flex: 1` is basis 0, which down a column
  collapses the child to no height — and a later `flexBasis` in the same style
  array does not reliably win. This silently deleted the date picker's title.
- `maxFontSizeMultiplier={1}` is legitimate on exactly one thing: an emoji
  standing in for an icon in a fixed column.

Verify with `xcrun simctl ui <udid> content_size accessibility-extra-extra-extra-large`
rather than by tapping through Settings.

**Home's "Needs a decision" cap cuts BETWEEN days and never inside one.**
`widgets/home-page/model/decisions.ts` fills to three rows and then stops taking
NEW days; a day it has started is always shown whole, so five trials converting
tomorrow are five rows. A plain `.slice(0, 3)` is the obvious simplification and
it is the one thing this card must not do — three of five shown is a user who
cancels three and is charged for the two the card chose not to mention. When
anything is left over the card says so and routes to the calendar, which draws
all six kinds; a silent truncation on the screen whose promise is "nothing
surprises you" is worse than no card. The band carries the four kinds where
opening the app still changes the outcome — `payment` belongs to the strip
above it, and `ends` is a decision the user already made.

**Colour means one thing at a time.** `accent` green is brand and interaction, never "money is good" — the sole exception is Home's next-month delta, where it marks a *direction* of change. `danger`/`warning`/`muted` on the calendar's agenda rows encode **when** (≤1 day / ≤7 rolling days / later), never what kind of event it is; the kind is carried by an SF Symbol. The one event that opts out is `ends`, which is always green because a cancellation takes money off the bill. Read the comments on the tokens before reusing one.

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

**The detail nav bar holds ONE trailing item and no title.** Edit had a
prominent bar button of its own; it now leads the ellipsis menu instead, because
the banner's identity is centred under that bar and a second glass capsule
pushed it off centre — for an action a menu can carry as its first row. The
title is `headerTitle: ""` on BOTH the page's own `<Stack.Screen>` and the root
layout's registration: the page's options sit after its loading and error
returns, so those two branches take the root's, and an unset title there falls
back to the route name (a literal "subscriptions/[id]/index" across the bar).

**The card owns the EVENT; the banner only says which subscription this is.**
Both used to print the same date, and the split has since gone the other way:
the banner keeps a line only for a subscription that is OVER
(`detail_heroEnded`), because that is the one state with no card underneath to
own the answer. While a next date exists the card states the whole event — what
will be taken, how long, the date, and whether a reminder will fire — and the
banner's own line was deleted along with `detail_heroRenews` / `heroEnds` /
`heroResumes`. The capsule still answers "what does this cost", which is a
different question from "what is about to happen": a trial converting before the
next payment makes those two different numbers.

The identity is a CENTRED column — a 108pt logo whose TOP edge sits on the nav
bar's own controls, so the mark is chrome with a capsule either side of it
rather than the first thing below the bar — and the name shrinks rather than
wrapping freely. Placing it needs the scroll view's REAL top inset
(`NAV_BAR_INSET`), which on iOS 26 is not the 44pt a standard bar is documented
at: the glass bar lays out taller and sits its controls near the top of that
band. It is measured, because `@react-navigation/elements` is not in this tree
and there is no `useHeaderHeight` to ask; it only places the logo, so a point or
two out moves the logo a point or two and nothing else.
Beside the logo it had 298pt and "Amazon" at 78pt broke MID-WORD; centred it has
the full width and "Adobe Creative Cloud" broke anyway, because one word was
wider than the phone, which no amount of width fixes. `numberOfLines={2}` plus
`useShrinkFloor(26, 18)` is the pattern the countdown beneath it already uses:
the floor is a point size, so the name still grows with Dynamic Type and only
stops growing past what the screen can set. The logo does not scale at all — it
is a picture, like the calendar's tiles.

**An amount printed beside a date must be the amount taken ON that date.**
`billing.preferred` is the price effective TODAY, and the list never settles a
due phase — `applyDuePhases` runs from `getSubscription` alone — so a row holds
the un-settled record and the phase it is about to move to side by side. Printing
the first while naming the second's date said "₴0.00, in 7 days" over a trial
converting in two, and "Cancelled · Sep 26" beside a live amount over a charge
`shouldIncludeOccurrence` had already excluded. `nextChargeBilling`
(`entities/subscription/model/next-charge.ts`, tested) answers the first; the
list row asks a winding-down subscription for `willBeCancelledAt` and greys its
amount when nothing more will be taken, which is the same cut the detail card
makes.

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

**Nothing hides the tab bar, and nothing should have to.** The detail screen is
a ROOT route pushed over the whole tab tree, so it covers the bar outright.
Before that it was nested in the subscriptions tab, which meant faking UIKit's
`hidesBottomBarWhenPushed` — react-native-screens does not expose it and
expo-router only offers `hidden` on the tab HOST, so `(tabs)/_layout.tsx` had to
read `useSegments()`, match the PAIR `subscriptions` + `[id]` (the category
editor is an `[id]` route too, and it is a sheet that must KEEP the bar), and
hold its last answer while a root modal covered the tabs and the segments stopped
mentioning them. All of that is gone, and the **currency picker is the second screen to follow
the rule** — `app/currency.tsx`, not `(tabs)/settings/currency`, even though
Settings is its only door. If a screen needs the tab bar out of the way, make it
a root route rather than bringing the flag back.

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

## Dependency pins that outrank the SDK manifest

`expo.install.exclude` in `package.json` is not a snooze button — it is the list
of deps that are deliberately off Expo SDK 57's manifest, and without it
`expo doctor` exits non-zero on every build. Take something off the list and the
check starts governing it again.

- **`react-native-gesture-handler` 3.x** — the SDK expects `~2.32.0`, so the
  check reports a *downgrade*. Taking it walks back a major under the
  `ReanimatedSwipeable` rows in `widgets/subscriptions-page` and
  `widgets/categories-page`.
- **`@sentry/react-native` 8.x** — the manifest's `~7.11.0` is a snapshot from
  the SDK's release day and trails every Sentry major. `getSentryExpoConfig`,
  the `expo` config plugin and the `Sentry.init` keys above all survive the
  jump.
- **`react`, `react-native-safe-area-context`,
  `@react-native-community/datetimepicker`** — ahead of the manifest by a patch
  or a minor. `react` is the one to watch: it floats only because
  `react-native@0.86.3` asks for `^19.2.3`, so read that peer range before
  moving it, never the doctor's exact pin.

Not on the list, because the check does not flag it: **`react-native-nitro-modules`
is capped at 0.36.x** by its caret, deliberately. `react-native-mmkv@4.3.2` ships
nitrogen-generated C++ and gradle built against that generation, and a newer
nitro fails at *link* time — nothing warns you until a native build.

Everything else follows `expo install --check` over npm `latest`; the SDK's
expected version is usually a few patches behind the registry.

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

**A store build without the cloud queue:** `bun run --cwd apps/mobile
build:ios:local` compiles the `production` profile on this Mac and drops a
signed `.ipa` in the gitignored `builds/`, ready to drag into Transporter.
Same profile, same remote credentials, same remote build number as a cloud
build — only the compiler moves. Three things differ and all three bite:

- **`LANG` must be UTF-8**, which is why the script sets it. CocoaPods and
  fastlane both refuse an ASCII-8BIT locale, and this Mac's login shell exports
  no `LANG` at all.
- **Secret EAS env vars are not downloadable**, by design — local builds get
  the `EXPO_PUBLIC_*` values from the `production` environment but never
  `SENTRY_AUTH_TOKEN`. Export it in the shell or the build ships with no source
  maps and every TestFlight stack trace is minified garbage.
- **`.env` is not in the archive.** eas-cli tarballs the git tree, so the
  gitignored `.env` — with its `test_…` RevenueCat key — cannot reach the
  bundle. That is load-bearing: a Test Store key in a store build crashes on
  launch (`docs/release/TESTFLIGHT-STEPS.md`). Never `--include-untracked` here.

**Android is two artifacts, not one.** Play accepts only an `.aab` and an
`.aab` cannot be sideloaded, so the tester lane and the upload lane are
different builds: `build:android:apk:local` (profile `production-apk`) makes
the `.apk` you hand to a tester, `build:android:local` makes the `.aab` you
upload. Both carry the `production` environment, so a tester exercises the real
keys. What that costs, and it is not the iOS guarantee:

- **They are not the same binary.** `production-apk` extends `production`, so
  each build takes its own remote `versionCode` — the APK a tester approved is
  build N and Play gets N+1. And Play App Signing re-signs the bundle, so the
  installed app's signature differs from the sideloaded one too. Nothing here
  pins a signature today; that stops being free the moment anything does.
- **`ANDROID_HOME` is unset in this Mac's login shell**, which is why the
  script points it at the standard SDK path rather than trusting the
  environment. Gradle's failure for a missing SDK names a path, not a cause.
- **There is no Android keystore on EAS yet** — no Android build has ever run.
  The first one prompts to generate it, so run it in a terminal that can answer.
  That keystore becomes the Play **upload key** permanently: back it up with
  `eas credentials` before it is the only copy.

**Pro does not work on Android.** `entities/pro/model/purchases.ts` configures
RevenueCat with `env.REVENUECAT_IOS_KEY` unconditionally — there is no
`Platform.OS` branch and no `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` in any EAS
environment. RevenueCat rejects an `appl_` key on Play, the module-scope
`try/catch` fails open, and the paywall reports "could not load" while every
gate falls back to the cache. A tester APK is otherwise honest; that one screen
is not.
