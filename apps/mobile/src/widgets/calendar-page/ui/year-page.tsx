import type { CalendarYearMonthDto } from "@subeye/model";
import { Stack, useRouter } from "expo-router";
import { memo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useCalendarYear } from "@/entities/calendar";
import { m } from "@/shared/i18n";
import { formatMoney, todayAsDay } from "@/shared/lib/format";
import { colors } from "@/shared/ui/theme";
import { monthNameLabel } from "../model/month";
import type { WeekStart } from "../model/settings";
import { useCalendarSettings } from "../model/settings";

/** Six rows of seven, like the month grid — every month is the same height. */
const ROWS = 6;

// A cell and the gap between two. `miniCells` is given the EXACT width of seven
// of them: a wrapping row obeys its container, and a third of a phone fits
// eleven, so without the width the weeks ran 8 and 11 wide and the block stopped
// being a calendar at all.
const CELL = 13;
const CELL_GAP = 2;
const WEEK_WIDTH = CELL * 7 + CELL_GAP * 6;

/**
 * How a day's spend becomes ink.
 *
 * Four steps rather than a continuous ramp. A linear opacity over a year whose
 * heaviest day is an annual plan leaves every ordinary day at 2% — visually
 * empty, which is exactly the month a user is trying to find. Buckets keep the
 * quiet days legible and still separate a pile-up from a single charge.
 *
 * The scale is the year's own heaviest day, not a currency amount: the same
 * grid has to read the same way in hryvnia and in dollars.
 */
const SHADES = [0.22, 0.42, 0.68, 1] as const;

function shadeFor(total: number, heaviest: number): number | null {
  if (total <= 0 || heaviest <= 0) return null;
  const step = Math.ceil((total / heaviest) * SHADES.length);
  return SHADES[Math.min(step, SHADES.length) - 1] as number;
}

/**
 * One month as a block of days, shaded by what each one charges.
 *
 * The cells are laid out on the SAME week start the month grid uses, so a
 * column here means the same weekday it means there — a heatmap whose columns
 * disagreed with the calendar beside it would be a different shape for the same
 * data.
 */
const MiniMonth = memo(function MiniMonth({
  month,
  heaviest,
  currencyCode,
  weekStart,
  onPress,
}: {
  month: CalendarYearMonthDto;
  heaviest: number;
  currencyCode: string;
  weekStart: WeekStart;
  onPress: (month: string) => void;
}) {
  const start = new Date(month.month);
  const firstWeekday = start.getUTCDay();
  const pad = weekStart === "monday" ? (firstWeekday + 6) % 7 : firstWeekday;

  // Keyed up front rather than in the render loop: the slot index is not a key
  // — a month whose 1st moves to another column would reuse a cell's identity
  // for a different day.
  const cells = Array.from({ length: ROWS * 7 }, (_, slot) => {
    const day = slot - pad;
    const total = month.dayTotals[day];
    return {
      key: total === undefined ? `pad-${slot}` : `day-${day}`,
      shade: total === undefined ? undefined : shadeFor(total, heaviest),
    };
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${monthNameLabel(month.month)}, ${formatMoney(
        month.total,
        currencyCode,
      )}`}
      onPress={() => onPress(month.month)}
      style={({ pressed }) => [styles.mini, pressed && styles.miniPressed]}
    >
      <Text style={styles.miniName} numberOfLines={1}>
        {monthNameLabel(month.month)}
      </Text>
      <View style={styles.miniCells}>
        {cells.map((cell) => (
          <View
            key={cell.key}
            style={[
              styles.cell,
              // A day that exists but charges nothing keeps a faint plate, so
              // the month's SHAPE stays readable; a padding slot gets nothing
              // at all, or February would look like it starts on the 1st of
              // whatever column it lands in.
              cell.shade !== undefined && styles.cellDay,
              cell.shade != null && {
                backgroundColor: colors.accent,
                opacity: cell.shade,
              },
            ]}
          />
        ))}
      </View>
      <Text style={styles.miniTotal} numberOfLines={1}>
        {month.total > 0
          ? formatMoney(month.total, currencyCode, { decimals: 0 })
          : "—"}
      </Text>
    </Pressable>
  );
});

/**
 * A whole year of spend, twelve months at a time.
 *
 * The Pro surface the calendar earns rather than the one it withholds: nothing
 * on the month screen was taken away to make room for this, and a free install
 * never sees a lock where this would be — it simply does not have this screen.
 *
 * Reads its own query rather than twelve months of the pager's cache. Assembling
 * it from `useCalendarMonth` would mean twelve list reads and twelve parses for
 * a figure the store can produce in one walk, and would mount twelve queries
 * this screen then throws away.
 */
export function YearPage() {
  const router = useRouter();
  const settings = useCalendarSettings();
  // The DEVICE's year, through `todayAsDay` — reading it off a raw instant puts
  // the user in next year for the last hours of 31 December east of UTC.
  const year = new Date(todayAsDay()).getUTCFullYear();
  const iso = `${year}-01-01T00:00:00.000Z`;
  const calendar = useCalendarYear(iso);

  // Back to the month, not forward to a new screen: this view exists to find a
  // month worth opening, and the pager behind it is already showing one.
  const openMonth = (month: string) =>
    router.dismissTo({
      pathname: "/calendar",
      params: { month: month.slice(0, 7) },
    });

  return (
    <>
      <Stack.Screen options={{ title: String(year) }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        {calendar.isPending ? (
          <ActivityIndicator color={colors.accent} style={styles.pending} />
        ) : calendar.isError ? (
          <Text style={styles.failed}>{m.common_loadFailed()}</Text>
        ) : (
          <>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{m.calendar_yearTotal()}</Text>
              <Text style={styles.totalAmount}>
                {formatMoney(calendar.data.total, calendar.data.currencyCode)}
              </Text>
            </View>

            <View style={styles.grid}>
              {calendar.data.months.map((month) => (
                <MiniMonth
                  key={month.month}
                  month={month}
                  heaviest={calendar.data.heaviestDayTotal}
                  currencyCode={calendar.data.currencyCode}
                  weekStart={settings.weekStart}
                  onPress={openMonth}
                />
              ))}
            </View>

            <Text style={styles.footnote}>{m.calendar_yearHint()}</Text>
          </>
        )}
      </ScrollView>
    </>
  );
}

// Three columns is what fits twelve months on one screen without scrolling on a
// 375pt phone, which is the point of the view — a year you have to scroll is
// the month pager again.
const COLUMNS = 3;

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 16 },
  pending: { paddingVertical: 40 },
  failed: {
    paddingVertical: 40,
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
  },

  totalRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 2,
  },
  totalLabel: {
    fontSize: 12.5,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: colors.muted,
  },
  totalAmount: { fontSize: 20, fontWeight: "700", color: colors.text },

  grid: { flexDirection: "row", flexWrap: "wrap" },
  mini: {
    width: `${100 / COLUMNS}%`,
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 6,
  },
  miniPressed: { opacity: 0.6 },
  miniName: { fontSize: 12.5, fontWeight: "700", color: colors.text },
  miniCells: {
    width: WEEK_WIDTH,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CELL_GAP,
  },
  // A fixed size rather than a percentage: a percentage cell rounds to a
  // fractional pixel, which makes alternate columns look a shade heavier.
  cell: { width: CELL, height: CELL, borderRadius: 3 },
  cellDay: { backgroundColor: colors.border },
  miniTotal: {
    fontSize: 11,
    color: colors.muted,
    fontVariant: ["tabular-nums"],
  },

  footnote: {
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.muted,
    paddingHorizontal: 2,
  },
});
