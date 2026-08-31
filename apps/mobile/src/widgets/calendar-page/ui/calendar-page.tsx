import { Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCalendarMonth } from "@/entities/calendar";
import { m } from "@/shared/i18n";
import { formatMoney } from "@/shared/lib/format";
import { colors } from "@/shared/ui/theme";
import { monthIso, monthLabel } from "../model/month";
import { useCalendarSettings } from "../model/settings";
import { WeekdayHeader } from "./month-grid";
import { MonthPager } from "./month-pager";

/** A standard iOS navigation bar. There is no `useHeaderHeight` in this tree. */
const NAV_BAR = 44;

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
      accessibilityLabel={direction === "back" ? "‹" : "›"}
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
 * FREE, all of it. The calendar shows no fact the app does not already give
 * away — Home's rail, the list and the due digest all name what is coming — so
 * charging for the arrangement would be charging for a rearrangement of the
 * user's own data. It is also a TAB, and a tab is navigation rather than a
 * feature: every other gate in this app sits on a row inside a screen someone
 * opened for another reason, where it costs them nothing to walk past. What
 * Pro still buys shows up here anyway, because a trial, an intro price and a
 * scheduled change can only exist on a Pro install — a paid calendar is denser
 * than a free one without a single gate in this file.
 *
 * ONLY the week-start row and the controls are fixed. The month's total, its
 * grid and its agenda all live inside the pager, together, because they are one
 * month and they have to travel as one: with the agenda below the pager it
 * showed the month being swiped AWAY from for the whole gesture and then
 * swapped its contents the instant the grid settled. There is no animation
 * anywhere in this screen now — the motion is the pager, and everything that
 * belongs to a month is inside it.
 *
 * The month name is the screen TITLE rather than a line of content. Home
 * already puts the current month in its own header for the same reason: every
 * figure below is scoped to it, and repeating it inside the page costs a fold.
 */
export function CalendarPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const settings = useCalendarSettings();
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const month = monthIso(offset);
  // A cache hit — the pager's own page asked for this month first.
  const calendar = useCalendarMonth(month);

  // The fixed block sits outside every scroll view, so nothing hands it UIKit's
  // automatic inset. iOS only: `nativeHeaderChrome` makes the bar transparent
  // there and opaque on Android, where content is already laid out below it.
  const headerTop = Platform.OS === "ios" ? insets.top + NAV_BAR : 0;

  const openDay = (date: string) => {
    setSelected(date);
    router.push({
      pathname: "/calendar/day/[date]",
      // The same `YYYY-MM-DD` the due-digest route takes. A full ISO instant
      // carries colons, which have no business in a path segment.
      params: { date: date.slice(0, 10) },
    });
  };

  const goTo = (next: number) => {
    if (next === offset) return;
    setOffset(next);
    // The selection names a day in the month being left, so keeping it would
    // light a tile in the new month that shares only its position in the grid.
    setSelected(null);
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: monthLabel(month) }} />

      <View style={[styles.header, { paddingTop: headerTop }]}>
        <View style={styles.controls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={m.when_today()}
            onPress={() => goTo(0)}
            style={({ pressed }) => [
              styles.chip,
              offset === 0 && styles.chipOn,
              pressed && styles.stepPressed,
            ]}
          >
            <Text
              style={[styles.chipLabel, offset === 0 && styles.chipLabelOn]}
            >
              {m.when_today()}
            </Text>
          </Pressable>
          {/* Kept beside the swipe, not replaced by it: a gesture is invisible
              until someone tries it, and VoiceOver needs a control to land on. */}
          <View style={styles.steps}>
            <StepButton direction="back" onPress={() => goTo(offset - 1)} />
            <StepButton direction="forward" onPress={() => goTo(offset + 1)} />
          </View>
        </View>

        {/* Fixed with the title rather than paged, and it is the one figure
            here that lags a swipe by a beat. The alternative was worse: inside
            the pager it has to sit BELOW the week-start row, which reads as a
            total for the grid rather than for the month. It keeps company with
            the navigation title, which is native and cannot animate either. */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{m.calendar_monthTotal()}</Text>
          <Text style={styles.totalAmount}>
            {calendar.data
              ? formatMoney(
                  calendar.data.monthTotal,
                  calendar.data.currencyCode,
                )
              : ""}
          </Text>
        </View>

        {/* Fixed rather than paged: the seven labels are the same in every
            month, so sliding them would move letters only to replace them with
            identical ones. */}
        <WeekdayHeader weekStart={settings.weekStart} />
      </View>

      <MonthPager
        offset={offset}
        onOffsetChange={goTo}
        settings={settings}
        selected={selected}
        onSelect={openDay}
        onOpenSubscription={(id) =>
          router.push({ pathname: "/subscriptions/[id]", params: { id } })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 12, paddingBottom: 6, gap: 10 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
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
  totalRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 4,
  },
  totalLabel: {
    fontSize: 12.5,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: colors.muted,
  },
  totalAmount: { fontSize: 20, fontWeight: "700", color: colors.text },
});
