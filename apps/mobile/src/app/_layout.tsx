import * as Sentry from "@sentry/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAppLocale } from "@/shared/i18n";
import "@/shared/lib/focus"; // side-effect only: registers focusManager↔AppState once
import { queryClient } from "@/shared/lib/query";
import "@/shared/lib/sentry"; // side-effect only: Sentry.init, before Sentry.wrap below
import { AppErrorBoundary } from "@/shared/ui/error-boundary";
import { nativeHeaderChrome } from "@/shared/ui/header";
import { colors } from "@/shared/ui/theme";

// expo-router looks for this exact named export on a layout and uses it as the
// error boundary for everything below. Without it a throw in any screen is a
// blank window in a Release build — the red box only exists in development. It
// is also what reports a render crash to Sentry.
export { AppErrorBoundary as ErrorBoundary };

// A deep link builds the root stack from the URL ALONE. Without an anchor the
// locked Home Screen widget's `subeye://paywall` opens a modal that is the only
// route in the stack, so every dismiss — including the one right after a
// completed purchase — is a GO_BACK no navigator handles. `(tabs)` puts the app
// underneath it. Named `anchor`; expo-router still accepts `initialRouteName`.
export const unstable_settings = { anchor: "(tabs)" };

// HOLD THE SPLASH ACROSS THE JS BOOT. Left to itself the native splash hides as
// soon as the root view exists — which is long before the bundle has evaluated,
// so the whole startup is a pure-black screen rather than the app's own
// background. Measured on a cold start: ~2.5s of black.
//
// Nothing here waits on the network, and there is no network to wait on: the
// store document is a synchronous MMKV read, so by the time React commits its
// first frame the tab tree already has real numbers in it — the splash hands
// straight over to a populated screen.
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

// A fixed tall detent, not "fitToContents": the document is a `flex: 1`
// ScrollView, which has no intrinsic height for the sheet to measure. It KEEPS
// its header — a policy runs well past the fold, and the sheet's own nav bar is
// the only place its title cannot scroll away from.
const legalSheet = {
  ...nativeHeaderChrome,
  presentation: "formSheet" as const,
  sheetGrabberVisible: true,
  sheetAllowedDetents: [0.9],
  // Explicit: this Stack's screenOptions turn headers off, and spreading
  // nativeHeaderChrome does not turn them back on — it only styles one.
  headerShown: true,
};

// FSD app layer: global providers + the native stack.
//
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
      <SafeAreaProvider>
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
            {/* Root-level so every gated surface — a tab, a nested stack, a
                sheet — can `router.push("/paywall")` and land on the same
                screen. It brings its own header options. */}
            <Stack.Screen
              name="paywall"
              options={{ presentation: "modal", headerShown: true }}
            />
            {/* Root-level for the same reason, and it has one more: the paywall
                is itself a root screen, so a sheet pushed from under its
                Restore button lands ON it rather than behind it. */}
            <Stack.Screen name="legal/[doc]" options={legalSheet} />
          </Stack>
        </QueryClientProvider>
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
