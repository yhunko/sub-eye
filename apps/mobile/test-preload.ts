import { mock } from "bun:test";

/**
 * The `required()` vars from `shared/config/env.ts`, which validates at MODULE
 * LOAD and sits on the import graph of most of these tests — so a checkout
 * without a `.env` does not fail on use, it fails on import, taking every test
 * in the file with it.
 *
 * bun auto-loads `.env`, so a developer machine has always had these and the
 * gap only shows on a machine that does not: CI has no `.env`, and this went
 * unnoticed because turbo replayed a remote cache hit for `@subeye/mobile#test`
 * until an unrelated change finally invalidated it. Adding a `required()` var
 * must not be able to break the suite that way again.
 *
 * `??=`, so a real `.env` still wins — a local run stays faithful to the build
 * it mirrors. Tests that assert on a URL set `EXPO_PUBLIC_API_URL` themselves
 * before importing the client; this is only a floor.
 */
process.env.EXPO_PUBLIC_API_URL ??= "https://api.test";
process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ??= "pk_test_x";
process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ??= "test_x";

/**
 * Stubs `react-native` for the whole test run.
 *
 * bun cannot parse React Native's entry point — it is Flow-typed
 * (`import typeof * as ... from './index.js.flow'`) — so ANY module that reaches
 * `react-native`, however indirectly, kills the file importing it. That is easy
 * to do without noticing: entities/user/api/preferences.ts imports the
 * subscription entity's barrel purely for its query keys, and the barrel now
 * carries mutation hooks that show a native Alert on failure.
 *
 * This is NOT a step towards rendering components — there is still no renderer
 * and that stays out of scope (see CLAUDE.md). It only keeps a native import in
 * some far-off corner of the graph from failing a pure-logic test.
 *
 * Add to the surface below when a test needs one; keep it to what is actually
 * touched rather than mirroring the whole API.
 */
mock.module("react-native", () => ({
  ActionSheetIOS: { showActionSheetWithOptions: () => {} },
  Alert: { alert: () => {} },
  Platform: { OS: "ios", select: (spec: Record<string, unknown>) => spec.ios },
}));

/**
 * Same problem, third time: `@sentry/react-native` reaches
 * `react-native/Libraries/TurboModule/TurboModuleRegistry`, past the stub above.
 * Crash reporting is deliberately woven into the low layers — the query client,
 * the token bridge, the error boundary — so the modules that import it are
 * exactly the ones a pure-logic test pulls in for a query key or a type.
 *
 * A no-op stub is also the behaviour under test: nothing should report from a
 * test run.
 */
mock.module("@sentry/react-native", () => ({
  init: () => {},
  captureException: () => {},
  setUser: () => {},
  wrap: (component: unknown) => component,
}));

/**
 * `react-native-mmkv` is a Nitro module: `createMMKV()` runs at import time and
 * throws without the native side, so anything reading a device flag — the Pro
 * entitlement cache, the notification settings — dies on import rather than on
 * use.
 *
 * A real in-memory store rather than a no-op: `readNotificationSettings` is
 * only meaningful if what was written comes back, and a stub returning
 * undefined would make every such test pass against defaults.
 */
mock.module("react-native-mmkv", () => {
  const store = new Map<string, boolean | string>();
  return {
    createMMKV: () => ({
      getBoolean: (key: string) => store.get(key) as boolean | undefined,
      getString: (key: string) => store.get(key) as string | undefined,
      set: (key: string, value: boolean | string) => store.set(key, value),
      remove: (key: string) => store.delete(key),
    }),
  };
});

/**
 * Same problem, one layer out: the subscription barrel exports
 * `useLifecycleActionBuilder`, which needs `useRouter` to open the edit/pricing
 * screens. expo-router reaches react-native through DEEP paths
 * (`react-native/Libraries/...`) that the stub above cannot intercept, so a test
 * that only wanted the barrel's query keys dies on a Flow parse error.
 */
mock.module("expo-router", () => ({
  useRouter: () => ({ push: () => {}, back: () => {} }),
}));

/**
 * `expo-crypto` is a native module — `randomUUID` calls straight into it, and
 * merely importing the package pulls in `expo/src/async-require/setup`, which
 * reads `__DEV__` and dies before any of that.
 *
 * Delegates to Bun's Web Crypto rather than returning a counter: `newId` in the
 * store ports is the only source of record ids, and a stub that repeated itself
 * would make a uniqueness test pass against a store that overwrites rows.
 */
mock.module("expo-crypto", () => ({
  randomUUID: () => crypto.randomUUID(),
}));
