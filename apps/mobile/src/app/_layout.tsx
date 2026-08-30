import * as Sentry from "@sentry/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { m, useAppLocale } from "@/shared/i18n";
import "@/shared/lib/focus"; // side-effect only: registers focusManager↔AppState once
import { queryClient } from "@/shared/lib/query";
import "@/shared/lib/sentry"; // side-effect only: Sentry.init, before Sentry.wrap below
import { AppErrorBoundary } from "@/shared/ui/error-boundary";
import {
  nativeHeaderChrome,
  nativeSearchBarChrome,
  nativeSheetChrome,
} from "@/shared/ui/header";
import { colors } from "@/shared/ui/theme";
import { currencySearch } from "@/widgets/currency-page";

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

// The legal sheet KEEPS its header — a policy runs well past the fold, and the
// sheet's own nav bar is the only place its title cannot scroll away from.
// Explicit `headerShown`, because this Stack's screenOptions turn headers off
// and spreading nativeHeaderChrome does not turn one back on — it only styles
// one.
const legalSheet = {
  ...nativeSheetChrome,
  ...nativeHeaderChrome,
  headerShown: true,
};

// The pause sheet is a single date field and cannot overflow, so it gets to be
// exactly as tall as it needs.
const compactSheet = {
  ...nativeSheetChrome,
  sheetAllowedDetents: "fitToContents" as const,
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
            {/* Root-level for the same reason as the paywall: four surfaces open
                it — Home's `+`, the list's `+`, Home's first-run empty state and
                the detail screen's Edit — and two of them live in a different
                tab from the list. Nested under `(tabs)/subscriptions` it was a
                cross-tab push: expo-router had to switch tabs and present the
                modal in one commit, so the tab visibly changed underneath and
                the modal's slide-up was swallowed by the switch. From the root
                it presents over whichever tab is showing and nothing moves
                behind it. headerShown: false because the nested layout inside
                brings its own nav bar. */}
            <Stack.Screen
              name="subscription-form"
              options={{ presentation: "modal", headerShown: false }}
            />
            {/* Root-level so it covers the native tab bar, the same argument the
                subscription detail makes: it is a 156-row list, and a floating
                tab bar sitting on its last row is a control the screen has no
                use for. Pushed from the root the bar slides away WITH the push
                rather than blinking out, which is what faking
                `hidesBottomBarWhenPushed` from the tab host could never do.

                Settings is the only door, so the back button names it outright —
                the screen underneath is the tab tree, which carries no title and
                made the button read literally "(tabs)".

                The search field is declared here rather than on the screen for
                the reason every other one is: options set inside a screen are
                re-pushed through `navigation.setOptions` on every render, which
                for a search field is one UISearchController rebuild per
                keystroke. */}
            <Stack.Screen
              name="currency"
              options={{
                ...nativeHeaderChrome,
                headerShown: true,
                title: m.settings_currency(),
                headerBackTitle: m.settings_title(),
                headerSearchBarOptions: {
                  ...nativeSearchBarChrome,
                  placeholder: m.currency_search(),
                  onChangeText: (event) =>
                    currencySearch.set(event.nativeEvent.text),
                },
              }}
            />
            {/* A subscription's own screen, and the three sheets it opens, are
                root routes for the same reason the form is one: Home's upcoming
                rail, the list, the due digest, a widget row and a tapped
                reminder all open it, and from Home it was a CROSS-TAB push —
                expo-router switched to the subscriptions tab and pushed the
                detail in one commit, so the tab changed underneath and the push
                animation was swallowed by the switch. From the root it slides
                over whichever tab is showing and `back` returns to it.

                Pushed over the tab tree, it also covers the native tab bar
                outright — which is why nothing hides that bar any more. The URL
                is unchanged (`(tabs)` is a group and never appeared in it), so
                `subeye:///subscriptions/<id>` still lands here, now with the tab
                tree anchored underneath instead of alone in a dead-end stack.

                Explicit `headerShown`: this Stack turns headers off, and the
                page only sets its own options once the subscription has loaded —
                without it the loading and error states have no nav bar and no
                way back. */}
            <Stack.Screen
              name="subscriptions/[id]/index"
              options={{
                ...nativeHeaderChrome,
                headerShown: true,
                // The screen underneath is the tab tree, which carries no
                // title of its own — so the back button fell back to the ROUTE
                // NAME and read literally "(tabs)". `generic` drops the
                // previous screen's title, which is the honest answer here
                // anyway: Home, the list, the due digest and a deep link all
                // reach this one screen, so there is no single place to name.
                headerBackButtonDisplayMode: "generic",
              }}
            />
            <Stack.Screen
              name="subscriptions/[id]/pricing"
              options={nativeSheetChrome}
            />
            <Stack.Screen
              name="subscriptions/[id]/pause"
              options={compactSheet}
            />
            <Stack.Screen
              name="subscriptions/[id]/renew"
              options={compactSheet}
            />
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
