import { Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useCalendarMonth } from "@/entities/calendar";
import { m } from "@/shared/i18n";
import { formatMoney } from "@/shared/lib/format";
import { colors } from "@/shared/ui/theme";
import { monthIso, monthLabel } from "../model/month";
import { useCalendarSettings } from "../model/settings";
import { Agenda } from "./agenda";
import { WeekdayHeader } from "./month-grid";
import { MonthPager } from "./month-pager";

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
 * ONE vertical scroll view, not a pinned grid over an inner scroller: a nested
 * scroller needs a fixed height for the agenda, and a fixed height on a box
 * full of text is what forces a Dynamic Type cap. The grid inside it pages
 * horizontally, which nests fine — the tab bar swipes on neither platform.
 *
 * The month name is the screen TITLE rather than a line of content. Home
 * already puts the current month in its own header for the same reason: every
 * figure below is scoped to it, and repeating it inside the page costs a fold.
 */
export function CalendarPage() {
  const router = useRouter();
  const settings = useCalendarSettings();
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const month = useMemo(() => monthIso(offset), [offset]);
  const calendar = useCalendarMonth(month);

  // The agenda moves WITH the grid, off the same scroll position, rather than
  // playing its own animation once the swipe has settled. That sequencing was
  // the complaint: the grid finished, then a moment later the list twitched.
  //
  // There is no timing curve here at all — the value is the pager's distance
  // from a settled page, so the motion is the gesture. Nothing can be
  // interrupted, nothing can be left mid-flight, and the arrows drive it too
  // because `scrollToIndex` scrolls.
  //
  // Two earlier attempts are worth not repeating. Reanimated's layout
  // `entering` on a re-keyed child inside a Fabric ScrollView left the agenda
  // stranded at partial opacity. `Animated.Value` with `useNativeDriver` was
  // worse: changing month makes `isPending` true for an uncached month, which
  // unmounted the branch holding the animated view, detached the native node
  // mid-curve and re-attached it at whatever it last committed — an agenda
  // stuck fully invisible, which is what swiping into October produced.
  const { width } = useWindowDimensions();
  const pageShift = useSharedValue(0);

  const agendaStyle = useAnimatedStyle(() => {
    // Dimmest exactly at the half-way point, where the contents change.
    const distance = Math.min(1, Math.abs(pageShift.value) * 2);
    return {
      opacity: 1 - distance * 0.85,
      // A FRACTION of the grid's travel. Matching it exactly would slide the
      // agenda off screen with nothing following it in; a parallax reads as
      // one surface at two depths.
      transform: [{ translateX: -pageShift.value * width * 0.35 }],
    };
  });

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
    <>
      <Stack.Screen options={{ title: monthLabel(month) }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
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

        <WeekdayHeader weekStart={settings.weekStart} />
        <MonthPager
          offset={offset}
          onOffsetChange={goTo}
          settings={settings}
          selected={selected}
          onSelect={openDay}
          pageShift={pageShift}
        />

        <View style={styles.divider} />
        {/* The animated view wraps ALL THREE states rather than only the loaded
            one. Inside the branch it unmounted the moment an uncached month
            made `isPending` true, which is precisely when this animation runs.

            It travels the way the grid just did: the list is the same month
            seen a second way, and sliding it the other way would read as two
            months moving in opposite directions at once. */}
        <Animated.View style={agendaStyle}>
          {calendar.isPending ? (
            <ActivityIndicator color={colors.accent} />
          ) : calendar.isError ? (
            <Text style={styles.failed}>{m.common_loadFailed()}</Text>
          ) : (
            <Agenda
              days={calendar.data?.days ?? []}
              onOpen={(id) =>
                router.push({ pathname: "/subscriptions/[id]", params: { id } })
              }
            />
          )}
        </Animated.View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 24, gap: 10 },
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
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 2 },
  failed: { fontSize: 14, color: colors.muted, textAlign: "center" },
});
