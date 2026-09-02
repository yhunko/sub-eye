import { router, Stack } from "expo-router";
import { usePro } from "@/entities/pro";
import { m } from "@/shared/i18n";
import { categorySheetChrome, nativeHeaderChrome } from "@/shared/ui/header";
import {
  calendarHeaderOptions,
  sheetCloseHeaderOptions,
} from "@/widgets/calendar-page";

// A deep link builds this stack from the URL alone, so without an anchor a
// `subeye:///calendar/day/2026-09-12` mounts with nothing under it: no back
// button and no way out but the tab bar. Matches the other two tab layouts.
export const unstable_settings = { anchor: "index" };

// The singleton, not `useRouter()`: built once, outside the component, so it
// never carries a hook's identity into a screen descriptor.
const openOptions = () => router.push("/calendar/options");
const closeSheet = () => router.back();

// Both sheets KEEP a header, purely to carry a real close button — see
// `sheetCloseHeaderOptions`. `categorySheetChrome` is the chrome that turns one
// back on, because `nativeSheetChrome` switches headers off and spreading the
// header chrome only styles one.
const sheetChrome = {
  ...categorySheetChrome,
  ...sheetCloseHeaderOptions(closeSheet),
};

export default function CalendarTabLayout() {
  // The one bar item that depends on the entitlement. Read HERE rather than in
  // the year screen so a free tap never mounts a screen it cannot use — and the
  // paywall it lands on carries a page about this calendar, so the tap answers
  // itself rather than dead-ending.
  const isPro = usePro();

  return (
    <Stack screenOptions={nativeHeaderChrome}>
      {/* No title here: the page sets it to the month it is showing, which is
          the one piece of chrome that DOES depend on screen state. */}
      <Stack.Screen
        name="index"
        options={calendarHeaderOptions({
          onYear: () => router.push(isPro ? "/calendar/year" : "/paywall"),
          onOptions: openOptions,
        })}
      />
      {/* Pushed, not a sheet: it is a destination the user reads and then picks
          a month out of, and a sheet cannot hand the screen underneath it a
          param without stacking a second one on itself. */}
      <Stack.Screen name="year" />
      <Stack.Screen name="day/[date]" options={sheetChrome} />
      <Stack.Screen
        name="options"
        options={{ ...sheetChrome, title: m.calendar_options() }}
      />
    </Stack>
  );
}
