import { Stack } from "expo-router";
import { m } from "@/shared/i18n";
import { nativeHeaderChrome } from "@/shared/ui/header";
import { colors } from "@/shared/ui/theme";

// Native form sheets: the navigator owns presentation, so there is no dialog
// manager anywhere in the app. "fitToContents" lets each sheet be exactly as
// tall as it needs — the pause sheet is one field, the form is a dozen.
const formSheet = {
  presentation: "formSheet",
  sheetGrabberVisible: true,
  sheetAllowedDetents: "fitToContents",
  headerShown: false,
  contentStyle: { backgroundColor: colors.bg },
} as const;

export default function SubscriptionsTabLayout() {
  return (
    <Stack screenOptions={nativeHeaderChrome}>
      <Stack.Screen name="index" options={{ title: m.subscriptions_title() }} />
      {/* The detail screen sets its own title from the subscription's name. */}
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="new" options={formSheet} />
      <Stack.Screen name="[id]/edit" options={formSheet} />
      <Stack.Screen name="[id]/pricing" options={formSheet} />
      <Stack.Screen name="[id]/pause" options={formSheet} />
    </Stack>
  );
}
