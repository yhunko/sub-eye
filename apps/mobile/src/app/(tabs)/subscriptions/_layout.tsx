import { Stack } from "expo-router";
import { m } from "@/shared/i18n";
import { nativeHeaderChrome } from "@/shared/ui/header";
import { colors } from "@/shared/ui/theme";

// Native form sheets: the navigator owns presentation, so there is no dialog
// manager anywhere in the app.
//
// A fixed tall detent rather than "fitToContents" for anything holding a
// ScrollView — a `flex: 1` scroller has no intrinsic height, so asking the sheet
// to size itself to its contents can measure to nothing.
// `as const` on the whole object would make sheetAllowedDetents a readonly
// tuple, which the navigator's mutable number[] will not accept — so only the
// string literals are pinned.
const scrollableSheet = {
  presentation: "formSheet" as const,
  sheetGrabberVisible: true,
  sheetAllowedDetents: [0.9],
  headerShown: false,
  contentStyle: { backgroundColor: colors.bg },
};

// The pause sheet is a single date field and cannot overflow, so it gets to be
// exactly as tall as it needs.
const compactSheet = {
  ...scrollableSheet,
  sheetAllowedDetents: "fitToContents" as const,
};

// A deep link builds the stack from the URL ALONE, so `subeye:///subscriptions/x`
// — a widget row, or a tapped reminder — pushed the detail screen as the ONLY
// route in this navigator: no back button, and the tab bar is hidden on that
// screen by design, so the app was a dead end until it was force-quit. The
// anchor puts the list underneath it. Same fix as the root layout's `(tabs)`
// anchor, one level down.
export const unstable_settings = { anchor: "index" };

export default function SubscriptionsTabLayout() {
  return (
    <Stack screenOptions={nativeHeaderChrome}>
      <Stack.Screen name="index" options={{ title: m.subscriptions_title() }} />
      {/* The detail screen sets its own title from the subscription's name. */}
      <Stack.Screen name="[id]/index" />
      {/* Opened by a digest reminder; titles itself from the date param. */}
      <Stack.Screen name="due/[date]" />
      {/* Add/edit is a full-screen modal that owns its own Stack, so it can
          push the category picker. headerShown: false because that nested
          layout brings its own nav bar. */}
      <Stack.Screen
        name="form"
        options={{ presentation: "modal", headerShown: false }}
      />
      <Stack.Screen name="filters" options={scrollableSheet} />
      <Stack.Screen name="[id]/pricing" options={scrollableSheet} />
      <Stack.Screen name="[id]/pause" options={compactSheet} />
      <Stack.Screen name="[id]/renew" options={compactSheet} />
    </Stack>
  );
}
