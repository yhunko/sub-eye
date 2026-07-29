import { Stack } from "expo-router";
import { m } from "@/shared/i18n";
import { nativeHeaderChrome } from "@/shared/ui/header";
import { colors } from "@/shared/ui/theme";

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
      {/* A fixed tall detent, not "fitToContents": the emoji grid lives in a
          ScrollView, and a `flex: 1` scroller has no intrinsic height for the
          sheet to measure against. Matches the subscription sheets. */}
      <Stack.Screen
        name="categories/[id]"
        options={{
          presentation: "formSheet",
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.9],
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
    </Stack>
  );
}
