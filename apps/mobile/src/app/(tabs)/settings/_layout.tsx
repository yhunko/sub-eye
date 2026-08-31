import { router, Stack } from "expo-router";
import { m } from "@/shared/i18n";
import { categorySheetChrome, nativeHeaderChrome } from "@/shared/ui/header";
import { categoryAddHeaderOptions } from "@/widgets/categories-page";

// A deep link builds this stack from the URL ALONE, so without an anchor
// `subeye:///settings/notifications` — or any of the four other sub-routes —
// mounts with nothing under it: no back button and no way out but the tab bar.
// It also bites on a plain Fast Refresh, which restores the current URL: reload
// while on a sub-screen and the screen you were editing becomes the root.
// Matches `(tabs)/subscriptions/_layout.tsx`.
export const unstable_settings = { anchor: "index" };

// The singleton, not `useRouter()`: this is built once, outside the component,
// so it never carries a hook's identity into a screen descriptor.
const openNewCategory = () => router.push("/settings/categories/new");

export default function SettingsTabLayout() {
  return (
    <Stack screenOptions={nativeHeaderChrome}>
      <Stack.Screen name="index" options={{ title: m.settings_title() }} />
      <Stack.Screen
        name="notifications"
        options={{ title: m.settings_notifications() }}
      />
      {/* The `+` is declared here rather than on the page for the same reason
          the subscriptions list's search field is: it depends on nothing the
          screen holds, and options set from inside a screen are re-pushed
          through `navigation.setOptions` on every render. */}
      <Stack.Screen
        name="categories/index"
        options={{
          title: m.settings_categories(),
          ...categoryAddHeaderOptions(openNewCategory),
        }}
      />
      <Stack.Screen name="categories/new" options={categorySheetChrome} />
      <Stack.Screen name="categories/[id]" options={categorySheetChrome} />
    </Stack>
  );
}
