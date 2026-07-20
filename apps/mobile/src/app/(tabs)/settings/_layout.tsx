import { Stack } from "expo-router";
import { m } from "@/shared/i18n";
import { nativeHeaderChrome } from "@/shared/ui/header";

export default function SettingsTabLayout() {
  return (
    <Stack screenOptions={nativeHeaderChrome}>
      <Stack.Screen name="index" options={{ title: m.settings_title() }} />
    </Stack>
  );
}
