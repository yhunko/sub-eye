import { Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useCalendarMonth } from "@/entities/calendar";
import { ProLock, usePro } from "@/entities/pro";
import { m } from "@/shared/i18n";
import { formatMoney } from "@/shared/lib/format";
import { colors } from "@/shared/ui/theme";
import { monthGrid, monthIso, monthLabel } from "../model/month";
import { useCalendarSettings } from "../model/settings";
import { Agenda } from "./agenda";
import { MonthGrid } from "./month-grid";

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
 * ONE scroll view, not a pinned grid over an inner scroller as the mock draws
 * it: a nested scroller needs a fixed height for the agenda, and a fixed height
 * on a box full of text is the thing this app's UI rules forbid outright — it is
 * what forces a Dynamic Type cap. Scrolling the grid away while reading the
 * agenda also gives the native tab bar something to minimise against.
 *
 * The month name is the screen TITLE rather than a line of content. Home already
 * puts the current month in its own header for the same reason: every figure
 * below is scoped to it, and repeating it inside the page costs a fold.
 */
export function CalendarPage() {
  const router = useRouter();
  const isPro = usePro();
  const settings = useCalendarSettings();
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const month = useMemo(() => monthIso(offset), [offset]);
  const calendar = useCalendarMonth(month, isPro);

  const cells = useMemo(
    () => monthGrid(month, settings.weekStart),
    [month, settings.weekStart],
  );
  const days = useMemo(
    () => new Map((calendar.data?.days ?? []).map((day) => [day.date, day])),
    [calendar.data],
  );

  const openDay = (date: string) => {
    setSelected(date);
    router.push({
      pathname: "/calendar/day/[date]",
      // The same `YYYY-MM-DD` the due-digest route takes. A full ISO instant
      // carries colons, which have no business in a path segment.
      params: { date: date.slice(0, 10) },
    });
  };

  const step = (by: number) => {
    setOffset((current) => current + by);
    // The selection names a day in the month we are leaving, so keeping it would
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
        {isPro ? (
          <View style={styles.controls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={m.when_today()}
              onPress={() => {
                setOffset(0);
                setSelected(null);
              }}
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
            <View style={styles.steps}>
              <StepButton direction="back" onPress={() => step(-1)} />
              <StepButton direction="forward" onPress={() => step(1)} />
            </View>
          </View>
        ) : (
          <ProLock
            title={m.paywall_lockCalendar()}
            body={m.paywall_lockCalendarBody()}
          />
        )}

        {isPro && calendar.data ? (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{m.calendar_monthTotal()}</Text>
            <Text style={styles.totalAmount}>
              {formatMoney(
                calendar.data.monthTotal,
                calendar.data.currencyCode,
              )}
            </Text>
          </View>
        ) : null}

        {/* Locked, the grid still draws: the day numbers and today's ring are
            the shape of what Pro buys, and an absent grid sells nothing. It is
            fed an empty map rather than a `locked` prop — there is no data to
            hide, because `useCalendarMonth` never ran. */}
        <MonthGrid
          cells={cells}
          days={days}
          settings={settings}
          selected={selected}
          onSelect={isPro ? openDay : () => router.push("/paywall")}
        />

        {isPro ? (
          <>
            <View style={styles.divider} />
            {calendar.isPending ? (
              <ActivityIndicator color={colors.accent} />
            ) : calendar.isError ? (
              <Text style={styles.failed}>{m.common_loadFailed()}</Text>
            ) : (
              <Agenda
                days={calendar.data?.days ?? []}
                onOpen={(id) =>
                  router.push({
                    pathname: "/subscriptions/[id]",
                    params: { id },
                  })
                }
              />
            )}
          </>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 24, gap: 12 },
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
