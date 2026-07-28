import { Stack } from "expo-router";
import { nativeHeaderChrome } from "@/shared/ui/header";

// No header: the tab bar already names this screen, and a bar carrying nothing
// but that same word costs the first card its place above the fold. The Stack
// stays for `contentStyle` — without it the screen falls back to React
// Navigation's light default background.
//
// The page's own ScrollView keeps `contentInsetAdjustmentBehavior="automatic"`,
// which is what clears the status bar now that no nav bar does it.
export default function HomeTabLayout() {
  return (
    <Stack screenOptions={{ ...nativeHeaderChrome, headerShown: false }} />
  );
}
