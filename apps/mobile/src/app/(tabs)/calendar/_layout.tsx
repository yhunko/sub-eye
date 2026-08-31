import { router, Stack } from "expo-router";
import { nativeHeaderChrome, nativeSheetChrome } from "@/shared/ui/header";
import { calendarOptionsHeaderOptions } from "@/widgets/calendar-page";

// A deep link builds this stack from the URL alone, so without an anchor a
// `subeye:///calendar/day/2026-09-12` mounts with nothing under it: no back
// button and no way out but the tab bar. Matches the other two tab layouts.
export const unstable_settings = { anchor: "index" };

// The singleton, not `useRouter()`: built once, outside the component, so it
// never carries a hook's identity into a screen descriptor.
const openOptions = () => router.push("/calendar/options");

export default function CalendarTabLayout() {
  return (
    <Stack screenOptions={nativeHeaderChrome}>
      {/* No title here: the page sets it to the month it is showing, which is
          the one piece of chrome that DOES depend on screen state. */}
      <Stack.Screen
        name="index"
        options={calendarOptionsHeaderOptions(openOptions)}
      />
      <Stack.Screen name="day/[date]" options={nativeSheetChrome} />
      <Stack.Screen name="options" options={nativeSheetChrome} />
    </Stack>
  );
}
