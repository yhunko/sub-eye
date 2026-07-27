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
 * Same problem, one layer out: the subscription barrel exports
 * `useLifecycleActionBuilder`, which needs `useRouter` to open the edit/pricing
 * screens. expo-router reaches react-native through DEEP paths
 * (`react-native/Libraries/...`) that the stub above cannot intercept, so a test
 * that only wanted the barrel's query keys dies on a Flow parse error.
 */
mock.module("expo-router", () => ({
  useRouter: () => ({ push: () => {}, back: () => {} }),
}));
