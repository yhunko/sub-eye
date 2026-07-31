import { Stack } from "expo-router";
import { m } from "@/shared/i18n";
import { nativeHeaderChrome } from "@/shared/ui/header";

// A fixed tall detent, not "fitToContents": the emoji grid lives in a
// ScrollView, and a `flex: 1` scroller has no intrinsic height for the sheet to
// measure against. Matches the subscription sheets.
//
// Unlike them it KEEPS its header: save and delete used to be buttons under a
// 120-tile grid, which put both of them below the fold of a 0.9 sheet. The
// sheet's own nav bar is the only slot that cannot scroll away. CategorySheet
// fills it.
const categorySheet = {
  ...nativeHeaderChrome,
  presentation: "formSheet" as const,
  sheetGrabberVisible: true,
  sheetAllowedDetents: [0.9],
};

export default function SettingsTabLayout() {
  return (
    <Stack screenOptions={nativeHeaderChrome}>
      <Stack.Screen name="index" options={{ title: m.settings_title() }} />
      <Stack.Screen
        name="notifications"
        options={{ title: m.settings_notifications() }}
      />
      <Stack.Screen
        name="categories/index"
        options={{ title: m.settings_categories() }}
      />
      <Stack.Screen name="categories/new" options={categorySheet} />
      <Stack.Screen name="categories/[id]" options={categorySheet} />
    </Stack>
  );
}
