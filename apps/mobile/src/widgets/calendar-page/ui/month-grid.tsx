import type { CalendarDayDto, CalendarEventKind } from "@subeye/model";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatMoney, todayAsDay } from "@/shared/lib/format";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { colors } from "@/shared/ui/theme";
import { useShrinkFloor } from "@/shared/ui/use-large-text";
import type { CalendarCell } from "../model/month";
import { weekdayLabels } from "../model/month";
import type { CalendarSettings, WeekStart } from "../model/settings";

// A tile is about 51pt wide on a 402pt screen and 47pt on a 375pt one, so two
// of these plus their gap is what fits — and two at 20pt are recognisable where
// three at 14pt were coloured specks. There is no setting for the count any
// more: with the logo this size the arithmetic only ever has one answer.
const LOGO = 20;
const LOGO_SLOTS = 2;

// A day's total, and the floor it may shrink to rather than wrap.
//
// A tile is ~51pt wide, which is about eight characters at 10pt: "₴100,860"
// fills it exactly and the next digit breaks it — and ₴100k+ in a day is one
// annual plan away in a soft currency, not an edge case. Shrinking is the app's
// answer for a headline figure rather than a cap, and the floor is a POINT size
// so the room to shrink into does not climb with Dynamic Type.
const TOTAL_SIZE = 10;
const TOTAL_FLOOR = 7.5;

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
  // Before the padding-slot guard below: a hook cannot sit after an early
  // return, and half the tiles in a six-row grid are padding.
  const totalFloor = useShrinkFloor(TOTAL_SIZE, TOTAL_FLOOR);

  if (!cell.date || cell.day === null) return <View style={styles.tile} />;

  const at = Date.parse(cell.date);
  const isToday = at === now;
  const past = at < now;
  const events = day?.events ?? [];

  // The overflow chip takes a LOGO'S slot rather than a second line: a wrapped
  // second row would make a busy day taller than a quiet one, in a grid whose
  // rows have to stay the same height.
  const overflowing = events.length > LOGO_SLOTS;
  const room = overflowing ? LOGO_SLOTS - 1 : LOGO_SLOTS;

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
        <Text
          style={[styles.total, past && styles.totalPast]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={totalFloor}
        >
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

/** The seven column headings. Fixed above the pager — they never change. */
export function WeekdayHeader({ weekStart }: { weekStart: WeekStart }) {
  return (
    <View style={styles.week}>
      {weekdayLabels(weekStart).map((label) => (
        <Text key={label} style={styles.weekday}>
          {label}
        </Text>
      ))}
    </View>
  );
}

/**
 * One month's tiles, six rows of seven.
 *
 * Tiles are a fixed `height`, which every other box in this app is forbidden —
 * but a calendar grid is the one place where the alternative is worse: rows of
 * different heights stop being a grid, and the day number is the only text here
 * that has to fit. Logos and the total are decoration a tight tile can drop
 * (`maxIcons`, the totals switch) rather than text that must not be capped.
 */
export function MonthCells({
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
  );
}

const GAP = 3;

const styles = StyleSheet.create({
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
    fontSize: 12,
    fontWeight: "700",
    lineHeight: LOGO,
    color: colors.muted,
  },
  total: { fontSize: TOTAL_SIZE, fontWeight: "700", color: colors.text },
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
