import { Stack } from "expo-router";
import { subscriptionFilters } from "@/entities/subscription";
import { m } from "@/shared/i18n";
import {
  nativeHeaderChrome,
  nativeSearchBarChrome,
  nativeSheetChrome,
} from "@/shared/ui/header";

// A deep link builds the stack from the URL ALONE, so `subeye:///subscriptions/due/x`
// — a tapped digest reminder — pushed the due list as the ONLY route in this
// navigator, with no back button and no way to reach the list it summarises.
// The anchor puts the list underneath it. Same fix as the root layout's
// `(tabs)` anchor, one level down.
export const unstable_settings = { anchor: "index" };

export default function SubscriptionsTabLayout() {
  return (
    <Stack screenOptions={nativeHeaderChrome}>
      {/* The search field lives HERE, not on SubscriptionsPage's own
          <Stack.Screen>: it depends on nothing the screen holds, and options
          declared inside a screen component are pushed through
          `navigation.setOptions` in an effect that re-runs on every focus change
          and every re-render, rebuilding the whole navigation item each time.
          On the layout it is part of the screen's initial descriptor instead.

          NOT the iOS 26 bottom-of-screen search: that is a tab-bar feature
          (`UITab.role = .search`), and expo-router's `NativeTabs.Trigger` `role`
          maps to the legacy `UITabBarItem.systemItem` instead — a normal tab
          with a magnifying-glass icon. Reaching the real one means adding a
          fourth Search tab, which is a screen, not a config change.

          onChangeText writes straight to the filter store; no debounce is needed
          because nothing fetches. */}
      <Stack.Screen
        name="index"
        options={{
          title: m.subscriptions_title(),
          headerSearchBarOptions: {
            ...nativeSearchBarChrome,
            placeholder: m.subs_searchPlaceholder(),
            onChangeText: (event) =>
              subscriptionFilters.set({ search: event.nativeEvent.text }),
          },
        }}
      />
      {/* Opened by a digest reminder; titles itself from the date param. */}
      <Stack.Screen name="due/[date]" />
      <Stack.Screen name="filters" options={nativeSheetChrome} />
    </Stack>
  );
}
