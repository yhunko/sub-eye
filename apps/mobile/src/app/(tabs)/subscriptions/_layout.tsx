import { Stack } from "expo-router";
import { m } from "@/shared/i18n";
import { nativeHeaderChrome } from "@/shared/ui/header";

export default function SubscriptionsTabLayout() {
  return (
    <Stack screenOptions={nativeHeaderChrome}>
      <Stack.Screen name="index" options={{ title: m.subscriptions_title() }} />
    </Stack>
  );
}
