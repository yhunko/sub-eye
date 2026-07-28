import { ClerkProvider } from "@clerk/clerk-expo";
import * as Sentry from "@sentry/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useProIdentity } from "@/entities/pro";
import { tokenCache, useClerkTokenBridge } from "@/shared/auth";
import { env } from "@/shared/config/env";
import { useAppLocale } from "@/shared/i18n";
import "@/shared/lib/focus"; // side-effect only: registers focusManager↔AppState once
import "@/shared/lib/online"; // side-effect only: registers onlineManager↔NetInfo once
import { queryClient } from "@/shared/lib/query";
import "@/shared/lib/sentry"; // side-effect only: Sentry.init, before Sentry.wrap below
import { AppErrorBoundary } from "@/shared/ui/error-boundary";
import { colors } from "@/shared/ui/theme";

// expo-router looks for this exact named export on a layout and uses it as the
// error boundary for everything below. Without it a throw in any screen is a
// blank window in a Release build — the red box only exists in development. It
// is also what reports a render crash to Sentry.
export { AppErrorBoundary as ErrorBoundary };

// HOLD THE SPLASH ACROSS THE JS BOOT. Left to itself the native splash hides as
// soon as the root view exists — which is long before the bundle has evaluated,
// so the whole startup is a pure-black screen rather than the app's own
// background. Measured on a cold start: ~2.5s of black.
//
// Nothing here waits on the network. `sessionHint` and the MMKV query cache are
// both read synchronously, so by the time React commits its first frame the
// tab tree already has real numbers in it — the splash hands straight over to a
// populated screen.
//
// Module scope on purpose: this has to run before the first native frame.
void SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden (a reload rather than a cold start). Nothing to hold.
});
SplashScreen.setOptions({ fade: true, duration: 200 });

// Dead man's switch. The splash is now held by us, so anything that throws
// before the root view lays out — a module-scope crash, a failed env
// validation — would otherwise leave it covering the screen forever, including
// the red box that would tell you why.
//
// ponytail: a flat timeout, not error-handler plumbing. It fires long after a
// healthy boot and never on one.
setTimeout(() => {
  void SplashScreen.hideAsync();
}, 5000);

// Renders nothing; feeds Clerk's session token into the shared transport.
function TokenBridge() {
  useClerkTokenBridge();
  return null;
}

// Renders nothing; aliases RevenueCat's app user id onto the Clerk user id.
// Importing @/entities/pro is also what configures the SDK — that happens once,
// at module load, before this ever mounts.
function ProIdentityBridge() {
  useProIdentity();
  return null;
}

// FSD app layer: global providers + the native stack.
//
// PROVIDER ORDER IS LOAD-BEARING:
//   ClerkProvider (tokenCache: expo-secure-store)
//     -> TokenBridge          wires getToken() into shared/api/client
//       -> PersistQueryClientProvider (MMKV persister)
//         -> Stack
// Clerk sits ABOVE Query so the token getter is set before any request fires.
// Re-keying the Stack on locale makes an Android per-app language change
// re-render every screen's strings.
function RootLayout() {
  const locale = useAppLocale();
  return (
    // Outermost, and required: without it the subscription rows' swipe-to-reveal
    // gestures are dead on Android. It must wrap the navigator, not sit inside a
    // screen, or gestures stop working the moment a screen unmounts.
    <GestureHandlerRootView
      style={styles.root}
      // First layout of the root view = React has committed a frame. Hiding here
      // rather than on some readiness flag is deliberate: it cannot get stuck
      // behind a state that never resolves.
      onLayout={() => {
        void SplashScreen.hideAsync();
      }}
    >
      {/* The auth screens have no native header, so they measure their own
          insets. Everything else rides the native header/tab chrome. */}
      <SafeAreaProvider>
        <ClerkProvider
          publishableKey={env.CLERK_PUBLISHABLE_KEY}
          tokenCache={tokenCache}
        >
          <TokenBridge />
          <ProIdentityBridge />
          {/* Dark-only app: force light status-bar icons regardless of OS appearance. */}
          <StatusBar style="light" />
          <QueryClientProvider client={queryClient}>
            <Stack
              key={locale}
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(auth)" />
              {/* Root-level so every gated surface — a tab, a nested stack, a
                  sheet — can `router.push("/paywall")` and land on the same
                  screen. It brings its own header options. */}
              <Stack.Screen
                name="paywall"
                options={{ presentation: "modal", headerShown: true }}
              />
            </Stack>
          </QueryClientProvider>
        </ClerkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Sentry.wrap adds the touch-event boundary, whose breadcrumbs are what turn a
// bare stack trace into "they tapped this, then that, then it died". It renders
// one flex:1 View around the tree, so the layout below is unchanged. It must be
// applied to the DEFAULT export — expo-router renders that, and an unwrapped one
// silently loses the breadcrumbs while everything still appears to work.
export default Sentry.wrap(RootLayout);

const styles = StyleSheet.create({ root: { flex: 1 } });
