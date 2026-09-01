import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { m } from "@/shared/i18n";
import { colors } from "@/shared/ui/theme";
import { monthIso, monthLabel, monthOffsetOf } from "../model/month";
import { useCalendarSettings } from "../model/settings";
import { MonthPager, type MonthPagerHandle } from "./month-pager";

/** A standard iOS navigation bar. There is no `useHeaderHeight` in this tree. */
const NAV_BAR = 44;

/**
 * Air under the bar's own items.
 *
 * `NAV_BAR` clears the bar's frame, not what is drawn in it: iOS 26 renders a
 * bar button as a glass capsule that fills most of that height, so the arrows
 * came to rest directly beneath the options button with nothing between them.
 */
const HEADER_GAP = 14;

const ISO_MONTH = /^\d{4}-\d{2}$/;

function StepButton({
  direction,
  onPress,
}: {
  direction: "back" | "forward";
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        direction === "back" ? m.calendar_prevMonth() : m.calendar_nextMonth()
      }
      onPress={onPress}
      style={({ pressed }) => [styles.step, pressed && styles.stepPressed]}
    >
      <SymbolView
        name={
          direction === "back"
            ? { ios: "chevron.left", android: "chevron_left" }
            : { ios: "chevron.right", android: "chevron_right" }
        }
        size={15}
        weight="semibold"
        tintColor={colors.text}
      />
    </Pressable>
  );
}

/**
 * The month, as a grid over an agenda.
 *
 * FREE, all of it, and with nothing withheld anywhere on it. The calendar shows
 * no fact the app does not already give away — Home's rail, the list and the due
 * digest all name what is coming — so charging for the arrangement would be
 * charging for a rearrangement of the user's own data. It is also a TAB, and a
 * tab is navigation rather than a feature.
 *
 * There WAS a truncated agenda under a lock here, and it withheld nothing: the
 * grid above it already printed each day's logos and total, and the day sheet
 * opened every one of them in full for a free install. A gate a user routes
 * around in one tap does not convert, it just teaches them the locks are
 * theatre. What Pro buys on this screen is additional now, never subtracted —
 * the month-over-month delta, the heavy-day flag and the year view — plus the
 * density that comes free with it, because a trial, an intro price and a
 * scheduled change can only exist on a Pro install.
 *
 * ONLY the controls are fixed. The total, the week-start row, the grid and the
 * agenda all live inside the pager, together, because they are one month and
 * they have to travel as one — and because anything pinned over a scrolling page
 * eventually clips it.
 *
 * The month name is the screen TITLE rather than a line of content. Home already
 * puts the current month in its own header for the same reason: every figure
 * below is scoped to it, and repeating it inside the page costs a fold.
 */
export function CalendarPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const settings = useCalendarSettings();
  const pager = useRef<MonthPagerHandle | null>(null);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  // A MIRROR of the pager's scroll position, never a driver of it. Everything
  // here that moves the calendar calls `pager.current.goTo`, so a control can
  // never be defeated by this already holding the value it wants to set.
  const onOffsetChange = useCallback((next: number) => {
    setOffset(next);
    // The selection names a day in the month being left, so keeping it would
    // light a tile in the new month that shares only its position in the grid.
    setSelected(null);
  }, []);

  // Written by the year view, which speaks months rather than offsets. A param
  // is input from outside the process even when this app wrote it.
  const { month: requested } = useLocalSearchParams<{ month?: string }>();
  useEffect(() => {
    if (!requested || !ISO_MONTH.test(requested)) return;
    pager.current?.goTo(monthOffsetOf(`${requested}-01T00:00:00.000Z`));
    // Cleared so that returning to this tab later does not re-jump to a month
    // the user has since paged away from.
    router.setParams({ month: undefined });
  }, [requested, router]);

  const openDay = useCallback(
    (date: string) => {
      setSelected(date);
      router.push({
        pathname: "/calendar/day/[date]",
        // The same `YYYY-MM-DD` the due-digest route takes. A full ISO instant
        // carries colons, which have no business in a path segment.
        params: { date: date.slice(0, 10) },
      });
    },
    [router],
  );

  const openSubscription = useCallback(
    (id: string) =>
      router.push({ pathname: "/subscriptions/[id]", params: { id } }),
    [router],
  );

  // The fixed block sits outside every scroll view, so nothing hands it UIKit's
  // automatic inset. iOS only: `nativeHeaderChrome` makes the bar transparent
  // there and opaque on Android, where content is already laid out below it.
  const headerTop =
    (Platform.OS === "ios" ? insets.top + NAV_BAR : 0) + HEADER_GAP;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: monthLabel(monthIso(offset)) }} />

      <View style={[styles.header, { paddingTop: headerTop }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={m.when_today()}
          onPress={() => pager.current?.goTo(0)}
          style={({ pressed }) => [
            styles.chip,
            offset === 0 && styles.chipOn,
            pressed && styles.stepPressed,
          ]}
        >
          <Text style={[styles.chipLabel, offset === 0 && styles.chipLabelOn]}>
            {m.when_today()}
          </Text>
        </Pressable>
        {/* Kept beside the swipe, not replaced by it: a gesture is invisible
            until someone tries it, and VoiceOver needs a control to land on. */}
        <View style={styles.steps}>
          <StepButton
            direction="back"
            onPress={() => pager.current?.goTo(offset - 1)}
          />
          <StepButton
            direction="forward"
            onPress={() => pager.current?.goTo(offset + 1)}
          />
        </View>
      </View>

      <MonthPager
        controls={pager}
        onOffsetChange={onOffsetChange}
        settings={settings}
        selected={selected}
        onSelect={openDay}
        onOpenSubscription={openSubscription}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  // Inset to 16 like the page's own rows below it, which is also where UIKit
  // puts a navigation bar's items — without it the forward arrow sat a few
  // points right of the options button above it, and Today a few points left of
  // "Month total".
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  steps: { flexDirection: "row", gap: 8 },
  step: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  stepPressed: { opacity: 0.6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.surfaceAlt },
  chipLabel: { fontSize: 13, fontWeight: "600", color: colors.muted },
  chipLabelOn: { color: colors.accent },
});
