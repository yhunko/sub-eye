import type { CalendarDayDto, CalendarEventKind } from "@subeye/model";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatMoney, todayAsDay } from "@/shared/lib/format";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { colors } from "@/shared/ui/theme";
import type { CalendarCell } from "../model/month";
import { weekdayLabels } from "../model/month";
import type { CalendarSettings } from "../model/settings";

const LOGO = 14;

/**
 * The kinds that put a dot on a tile: the ones where what you pay changes.
 *
 * A charge is not one of them — a tile with charges already says so with its
 * logos, and dotting every populated day makes the dot mean "populated", which
 * the tile's own fill already says.
 */
const DOTTED: Partial<Record<CalendarEventKind, true>> = {
  trialEnds: true,
  introEnds: true,
  priceChange: true,
};

function DayTile({
  cell,
  day,
  settings,
  selected,
  onPress,
  now,
}: {
  cell: CalendarCell;
  day: CalendarDayDto | undefined;
  settings: CalendarSettings;
  selected: boolean;
  onPress: (date: string) => void;
  now: number;
}) {
  if (!cell.date || cell.day === null) return <View style={styles.tile} />;

  const at = Date.parse(cell.date);
  const isToday = at === now;
  const past = at < now;
  const events = day?.events ?? [];

  // The overflow chip takes a LOGO'S slot rather than a second line: one logo
  // and "+4" says less than two logos and "+3", and a wrapped second row makes a
  // busy day twice the height of a quiet one in a grid of fixed rows.
  const overflowing = events.length > settings.maxIcons;
  const room = overflowing ? settings.maxIcons - 1 : settings.maxIcons;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${cell.day}${
        day
          ? `, ${formatMoney(day.total, day.events[0]?.currencyCode ?? "")}`
          : ""
      }`}
      onPress={() => onPress(cell.date as string)}
      style={({ pressed }) => [
        styles.tile,
        events.length > 0 && (past ? styles.tileSpent : styles.tileFilled),
        isToday && !selected && styles.tileToday,
        selected && styles.tileSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.number,
          past && styles.numberPast,
          isToday && styles.numberToday,
          (isToday || selected) && styles.numberStrong,
        ]}
      >
        {cell.day}
      </Text>

      <View style={styles.logos}>
        {events.slice(0, room).map((event) => (
          <BrandLogo
            key={event.key}
            name={event.name}
            brandDomain={event.brandDomain}
            size={LOGO}
            dimmed={past}
          />
        ))}
        {overflowing ? (
          <Text style={styles.overflow}>{`+${events.length - room}`}</Text>
        ) : null}
      </View>

      {settings.showDayTotals && day && day.total > 0 ? (
        <Text style={[styles.total, past && styles.totalPast]}>
          {formatMoney(day.total, day.events[0]?.currencyCode ?? "", {
            decimals: 0,
          })}
        </Text>
      ) : null}

      {events.some((event) => DOTTED[event.kind]) ? (
        <View style={styles.dot} />
      ) : null}
    </Pressable>
  );
}

/**
 * The month, seven columns wide.
 *
 * Tiles are a fixed `height`, which every other box in this app is forbidden —
 * but a calendar grid is the one place where the alternative is worse: rows of
 * different heights stop being a grid, and the day number is the only text here
 * that has to fit. Logos and the total are decoration that a tight tile can drop
 * (`maxIcons`, the totals switch) rather than text that must not be capped.
 */
export function MonthGrid({
  cells,
  days,
  settings,
  selected,
  onSelect,
  now = new Date(),
}: {
  cells: CalendarCell[];
  days: Map<string, CalendarDayDto>;
  settings: CalendarSettings;
  selected: string | null;
  onSelect: (date: string) => void;
  now?: Date;
}) {
  const today = todayAsDay(now);

  return (
    <View style={styles.grid}>
      <View style={styles.week}>
        {weekdayLabels(settings.weekStart).map((label) => (
          <Text key={label} style={styles.weekday}>
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.cells}>
        {cells.map((cell) => (
          <View key={cell.key} style={styles.slot}>
            <DayTile
              cell={cell}
              day={cell.date ? days.get(cell.date) : undefined}
              settings={settings}
              selected={selected !== null && cell.date === selected}
              onPress={onSelect}
              now={today}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const GAP = 3;

const styles = StyleSheet.create({
  grid: { gap: 5 },
  week: { flexDirection: "row" },
  weekday: {
    flexBasis: 0,
    flexGrow: 1,
    textAlign: "center",
    fontSize: 10.5,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.muted,
  },
  cells: { flexDirection: "row", flexWrap: "wrap" },
  // A percentage basis rather than flex, because the rows wrap: seven per row
  // only holds if each slot claims exactly a seventh of the width.
  slot: { width: `${100 / 7}%`, padding: GAP / 2 },
  tile: {
    height: 66,
    alignItems: "center",
    paddingTop: 6,
    paddingBottom: 5,
    gap: 4,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "transparent",
  },
  tileFilled: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  tileSpent: {
    backgroundColor: colors.surfacePast,
    borderColor: colors.borderPast,
  },
  tileToday: { borderColor: colors.accentBorder },
  tileSelected: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.accent,
  },
  pressed: { opacity: 0.7 },
  number: {
    fontSize: 12.5,
    lineHeight: 13,
    fontWeight: "600",
    color: colors.text,
  },
  numberPast: { color: colors.mutedPast },
  numberToday: { color: colors.accent },
  numberStrong: { fontWeight: "700" },
  logos: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignContent: "flex-start",
    gap: 2,
    width: "100%",
  },
  overflow: {
    fontSize: 9.5,
    fontWeight: "700",
    lineHeight: LOGO,
    color: colors.muted,
  },
  total: { fontSize: 10, fontWeight: "700", color: colors.text },
  totalPast: { color: colors.mutedPast },
  dot: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 4.5,
    height: 4.5,
    borderRadius: 999,
    backgroundColor: colors.warning,
  },
});
