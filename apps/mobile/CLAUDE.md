# @subeye/mobile — Agent Guidelines

`apps/mobile` (`@subeye/mobile`) is the **v4 SubEye client**: an Expo (React Native, expo-router) app over the pruned Hono API in `apps/server`. It replaces the retired React/Vite web client. Read this before touching mobile code.

**Seven screens. Every addition requires an explicit argument.** The v3 client reached 33,991 hand-written LOC because features were fun to build, not because they were needed. Do not reproduce that here.

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
- **Sheets are native `formSheet` routes**, the only sheet mechanism in the app: Manage-pricing, Pause, the category editor, and the list-options sheet that is now **Android's fallback only**. `presentation: "formSheet"` with `sheetGrabberVisible: true`, plus a fixed detent for anything holding a ScrollView (a `flex: 1` scroller has no intrinsic height, so `fitToContents` can measure to nothing). There is **no NiceModal / modal-manager equivalent** — the navigator owns presentation.
- **A sheet is the fallback, not the first answer.** Where UIKit has a control, use the control: the subscriptions list puts sort / group / status / category behind a real **UIMenu** via `unstable_headerLeftItems` / `unstable_headerRightItems` (expo-router's wrapper over `headerLeftBarButtonItems`), and the detail screen does the same for its lifecycle actions. Items take **`label`, not `title`** — expo-router renames the RNScreens field — and submenus are **single-selection by default** (`multiselectable` is false unless set), so UIKit draws the checkmark itself from each action's `state: "on" | "off"`. Set **`multiselectable: true` on the outer `menu`** whenever its children are all submenus: the default sends `UIMenuOptionsSingleSelection` to a menu that owns no selectable actions, which is what the missing checkmarks were traced to. UIKit gives a submenu **no subtitle, no value slot and no per-item tint**, so a submenu announces itself two ways and only when it is off its default: the **filled variant of its own SF Symbol**, and the chosen value appended to the label (`"Status · Paused"`). A submenu at rest stays a plain glyph and a bare noun — spelling out every default made the top level four sentences long, and the defaults are the longest strings in their own lists. A submenu has **no `disabled`** field, so an empty submenu has to be omitted from the array rather than greyed out. expo-router only swaps native items in **on iOS**, so a screen that uses them keeps its `headerLeft`/`headerRight` Pressables as the Android path — and anything added to the menu must be added to Android's sheet too, or the feature silently does not exist there.
- **Add/Edit is the exception: a `presentation: "modal"` route that owns its own `Stack`** (`app/(tabs)/subscriptions/form/`). It was a formSheet pinned at a 0.9 detent — a modal's footprint without a modal's navigation — which forced the category picker into an ActionSheet with no search and no create. A sheet cannot push a sub-screen without stacking a second sheet on itself. Anything that outgrows an action sheet becomes a pushed screen in that nested stack; the form's draft lives in a React **context** on its layout (`widgets/subscription-form/model/form-context.tsx`), NOT a module store — a half-typed subscription must die with the modal.
- **`headerSearchBarOptions` uses `placement: "stacked"` + `hideWhenScrolling: false`** on both the category picker and the subscriptions list — a real `UISearchBar` pinned under the nav bar, glass header and all. Not `placement: "automatic"`: UIKit picks a field that retracts on the first scroll, so on a list long enough to want searching the control is gone exactly when it is wanted. If it ever appears not to render, suspect a stale Fast Refresh before concluding the platform cannot do it: a full relaunch was the difference here, and a hand-rolled `TextInput` lookalike was very nearly shipped over it.
- **Confirms are native**: ActionSheet + `Alert`. Not a custom dialog component.

## Native tabs & headers

- **Tab bar:** `<NativeTabs minimizeBehavior="onScrollDown">` from `expo-router/unstable-native-tabs` — Liquid Glass on iOS 26, Material 3 on Android. Three triggers: `(home)`, `subscriptions`, `settings`.
- **ALPHA CONSTRAINT:** triggers must be **static**. Do not map an array into `<NativeTabs.Trigger>`, do not conditionally render one, do not compute `name`. Icons use two platform props — `sf` (iOS SF Symbol name) and `md` (Android Material Symbols name); there is no cross-platform icon component.
- **Tabs need a nested `Stack` per tab to get a header.** `NativeTabs` children are bare screens with no navigator, so `<Stack.Screen options>` is inert on them. Each tab is a folder with `_layout.tsx` (a `Stack` carrying `nativeHeaderChrome`) plus `index.tsx`.
- **Header chrome comes from `@/shared/ui/header`** (`nativeHeaderChrome`), spread into every headered screen. iOS gets `headerTransparent: true` + `scrollEdgeEffects: { top: "soft" }`; **Android gets an OPAQUE bar** — glass is iOS-only there, and a transparent header leaves scroll content stacked *under* the bar because `scrollEdgeEffects` and `contentInsetAdjustmentBehavior` are both iOS no-ops.
- **Never** set `headerStyle.backgroundColor` or `headerBlurEffect` on iOS: a solid background kills the glass, and `headerBlurEffect` paints a permanent gray band over the near-black app while overlapping `scrollEdgeEffects`.
- **Every scroll view under a header** sets `contentInsetAdjustmentBehavior="automatic"` and keeps `contentContainerStyle.paddingBottom` small (~24) — the automatic inset already clears the floating tab bar. **Home has no header at all** (`headerShown: false`); the same automatic inset is what clears its status bar, so do not swap it for a manual `useSafeAreaInsets` padding.
- **A nested horizontal ScrollView sets `automaticallyAdjustContentInsets={false}`** (Home's upcoming rail). Without it the inner scroller inherits the outer one's automatic inset and starts pushed in by the status-bar height.

## Transport

- `shared/api/client.ts` holds the **only** `apiClient`. It is built **once at module load** over a single mutable module-level `getToken`; `useClerkTokenBridge` swaps it via `setTokenGetter`. **Never rebuild the client on auth change, and never reset the getter on sign-out** — Clerk's `getToken()` is offline-cached and returns null when signed out, so anonymous and signed-in are both correct with no reset.
- `hc` comes from **`hono` directly**, not from `@subeye/server/client`. That export is a **types-only build** (`apps/server/dist/src/client.d.ts`) — it provides `ServerRpcType`, not a runtime factory. This is the documented exception to the root CLAUDE.md "packages export source" rule: Metro is not Vite, and dragging the server source into the mobile typecheck is not a DX win.
- The server sets `.basePath("/api")`, which Hono RPC reflects as the **`.api` accessor** at call sites (`apiClient.api.analytics.…`). Base URL = **`EXPO_PUBLIC_API_URL` verbatim** — appending `/api` here doubles the prefix and every request 404s at `/api/api/…`.
- **Every non-2xx throws an `ApiError`** carrying `status` and the server's machine-readable `code` (from `{ success:false, error:{ code, message } }`). Branch on `error.code`, never on `error.message` — the message is human copy and will change.
- **`assertOk(res)` before `res.json()`.** Hono RPC leaks the route's error-response shapes into the success type; `assertOk` narrows to the 2xx branch.
- **`createAuthFetch` casts its result to `typeof fetch`.** `bun-types` (in scope for `bun:test`) augments the global fetch with a required `preconnect` static that a React Native transport does not implement, and Hono's `fetch` option demands `typeof fetch`. The cast is at the boundary; Hono only ever invokes the call signature.
- **Query cache is persisted to MMKV** (`shared/lib/query.ts`), `maxAge`/`gcTime` 7 days, `buster` = `expo.version` + a manual `PERSIST_SCHEMA`. Bump `PERSIST_SCHEMA` on any OTA update that changes a persisted DTO shape.
- **The cache is hydrated SYNCHRONOUSLY at module load, not by `PersistQueryClientProvider`.** That component starts its restore inside a `useEffect`, so React has already committed a frame with an empty cache — and every screen branches on `isPending`, so that frame is a full-page spinner. MMKV reads synchronously, so `shared/lib/persisted-cache.ts` applies TanStack's own expiry/buster rules and `hydrate()`s before the first render; `persistQueryClientSubscribe` handles saving. **Do not reintroduce `PersistQueryClientProvider`** — its `isRestoring` gate also pauses every query until the restore resolves, which is the opposite of cache-first.
- **There is no pull-to-refresh.** Revalidation is invisible: `shared/lib/focus.ts` wires `AppState` into TanStack's `focusManager`, so returning to the app refetches everything stale (>5 min) behind the cached screen. RN has no `visibilitychange`, so **without that bridge `refetchOnWindowFocus` silently does nothing** — which is why a `RefreshControl` used to be load-bearing. Do not add one back.
- **MMKV is v4 (Nitro):** instantiate via `createMMKV()`, **not** `new MMKV()` (which throws on v4).

## Strings (i18n)

- Paraglide, locales **en + uk**, `baseLocale: "en"`. Catalogs live in `apps/mobile/messages/{locale}.json` with their own `project.inlang` — **deliberately NOT the web client's 785-key catalog**. Keep the mobile catalog small.
- Compiled into `src/shared/i18n/paraglide` (**gitignored**) by `bun run i18n:generate`, which auto-runs before `start`/`ios`/`android`/`type-check`.
- Strategy is `--strategy globalVariable baseLocale` — **space-separated, two arguments**. A comma-joined `globalVariable,baseLocale` compiles to one malformed strategy and makes `getLocale()` throw at runtime.
- **NEVER call `m.someKey()` at module scope.** Module-level tables hold the message-function *reference* (`label: m.foo`) and invoke it at render time; otherwise the string freezes in whichever locale was active at import.
- Locale is resolved **once at bootstrap** (`shared/i18n/index.ts` → `expo-localization` `getLocales()` → first of en/uk → else **en**) and re-synced by `useAppLocale()` in the root layout, which re-keys the `Stack`. Language switching is **OS-native only** (per-app language in iOS Settings / Android 13+) — no in-app locale state, no MMKV override.
- Native OS copy (app display name, permission prompts) lives in `apps/mobile/locales/{locale}.json` via `expo.locales`. Editing it needs a **rebuilt dev client**, not a Metro reload.
- New keys are `prefix_camelCase` and must be added to **both** catalogs.

## UI

RN `StyleSheet` only — no Tailwind, no shadcn, no Radix, no styled-components. Tokens come from `@/shared/ui/theme`; the app is **dark-only** (`app.json` pins `userInterfaceStyle: "dark"`). Cap layout-critical text with `maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}`; leave prose uncapped for accessibility.

**Colour means one thing at a time.** `accent` green is brand and interaction, never "money is good" — the sole exception is Home's next-month chip, where it marks a *direction* of change. `danger`/`warning`/`muted` on Home's upcoming rail encode **when** (≤1 day / ≤7 rolling days / later), never what kind of event it is; the kind is carried by an SF Symbol. The one event that opts out is `ends`, which is always green because a cancellation takes money off the bill. Read the comments on the tokens before reusing one.

**The subscriptions list is a `SectionList`**, always — the ungrouped case is one section whose header renders `null`, which is cheaper than branching between two list components. Grouping lives in `entities/subscription/model/grouping.ts` (pure, tested); section headers total `billing.preferred.monthly` so a yearly group is comparable to a monthly one. Headers do **not** stick: they are borderless text on the page background, and pinning one would let rows slide through its letters.

**Splash screen.** The `expo-splash-screen` config **must keep its `image`**. The plugin only points the generated storyboard at the `SplashScreenBackground` colorset from the code path that installs the image view — with `backgroundColor` alone the colorset is still written but nothing references it, and the storyboard falls back to `systemBackgroundColor`, which under this app's forced dark mode is pure **black**. That is a black launch screen for the whole JS boot (measured: ~3s in a Release build). `_layout.tsx` holds the splash across that boot and hides it on the root view's first layout.

**App icon.** `icon.icon/` is an Apple **Icon Composer** bundle and is the source of truth — `ios.icon` points straight at it (SDK 54+), so Apple renders the gradient, shadow and translucency. **Android cannot read a `.icon` bundle**, and a `.icon` path on the *root* `icon` key is rejected by `@expo/prebuild-config`, so the two Android PNGs in `assets/` are generated from the same four layer SVGs by `python3 scripts/build-android-icon.py`. **Rerun it after any edit under `icon.icon/Assets/`** or the platforms drift. Native dirs are CNG-generated and gitignored, so an icon change needs `bun run prebuild` + a native rebuild — Metro reload will not show it.

## Environment

`EXPO_PUBLIC_*` vars are inlined by Metro **at bundle time** — changing `.env` needs a Metro **restart**, not a reload. They are validated at module load in `shared/config/env.ts`, which throws loudly on a missing var. On-device dev must point `EXPO_PUBLIC_API_URL` at a device-reachable host (LAN IP or tunnel) — **never `localhost`**, because the request originates on the phone.

Build numbers (`ios.buildNumber` / `android.versionCode`) are **EAS-owned — never hand-edit**. The marketing version is per-profile in `app.config.js`: production uses the hand-set `expo.version` in `app.json`; every other profile uses the fixed `BETA_VERSION` and lets the EAS build number move.

## Testing

`bun test ./src` — `bun:test`, there is no vitest anywhere in the repo. Test **pure logic only** — locale resolution, transport error mapping, and later the pricing/spend derivations. **No React Native component renders** (no renderer is configured, and it is out of scope). Co-locate tests as `*.test.ts` next to the module.

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
