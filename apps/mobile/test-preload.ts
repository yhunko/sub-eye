import { mock } from "bun:test";

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
