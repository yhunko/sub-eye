import type { CalendarDayDto, CalendarEventKind } from "@subeye/model";
import { memo } from "react";
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

// With day totals switched off the tile has ~18pt of height going spare under
// the logos, and it is the only thing in here that can use it.
//
// WIDTH is what caps the pair, not the height it just gained: two logos plus
// their 2pt gap have to fit the 47pt tile of a 375pt screen, which lands at 22
// and no higher — go past it and the row wraps, which makes a busy tile two
// logo-rows tall inside a grid whose rows are a fixed height, and the second
// row is simply clipped. A day with a SINGLE charge has the whole width to
// itself and is limited by height instead, so it gets to be properly large.
const LOGO_ROOMY = 22;
const LOGO_ROOMY_SOLO = 30;

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

/**
 * A day with nothing on it. Not a `Pressable`, not a disabled one.
 *
 * Two thirds of a month are usually empty, and every one of them used to open a
 * sheet that said "nothing due" — a tap that costs a navigation to tell the user
 * what the blank tile they tapped had already told them. It also put 42 press
 * responders per page into a horizontal pager, three pages deep.
 */
function EmptyTile({
  day,
  past,
  isToday,
  adjacent,
}: {
  day: number;
  past: boolean;
  isToday: boolean;
  adjacent: boolean;
}) {
  return (
    <View style={[styles.tile, isToday && styles.tileToday]}>
      <Text
        style={[
          styles.number,
          past && styles.numberPast,
          adjacent && styles.numberAdjacent,
          // Today keeps its ring and its accent even with nothing on it — it is
          // WHERE YOU ARE, which is true of an empty day too, and true of the
          // 30th shown at the head of October's grid.
          isToday && styles.numberToday,
          isToday && styles.numberStrong,
        ]}
      >
        {day}
      </Text>
    </View>
  );
}

const DayTile = memo(function DayTile({
  cell,
  day,
  heavy,
  settings,
  selected,
  onPress,
  now,
}: {
  cell: CalendarCell;
  day: CalendarDayDto | undefined;
  heavy: boolean;
  settings: CalendarSettings;
  selected: boolean;
  onPress: (date: string) => void;
  now: number;
}) {
  // Before the empty-tile guard below: a hook cannot sit after an early return,
  // and most of the tiles in a six-row grid have nothing on them.
  const totalFloor = useShrinkFloor(TOTAL_SIZE, TOTAL_FLOOR);

  const at = Date.parse(cell.date);
  const past = at < now;
  const isToday = at === now;

  if (!day?.events.length) {
    return (
      <EmptyTile
        day={cell.day}
        past={past}
        isToday={isToday}
        adjacent={cell.adjacent}
      />
    );
  }

  const events = day.events;

  // The overflow chip takes a LOGO'S slot rather than a second line: a wrapped
  // second row would make a busy day taller than a quiet one, in a grid whose
  // rows have to stay the same height.
  const overflowing = events.length > LOGO_SLOTS;
  const room = overflowing ? LOGO_SLOTS - 1 : LOGO_SLOTS;

  // Keyed to the SETTING rather than to whether this particular tile draws a
  // total, so the whole grid changes together. Tied to the tile, the bottom
  // row's adjacent days — which never carry a total — would sit there larger
  // than the month above them.
  const logo = settings.showDayTotals
    ? LOGO
    : events.length === 1
      ? LOGO_ROOMY_SOLO
      : LOGO_ROOMY;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${cell.day}, ${formatMoney(
        day.total,
        events[0]?.currencyCode ?? "",
      )}`}
      onPress={() => onPress(cell.date)}
      style={({ pressed }) => [
        styles.tile,
        // A neighbouring month's day carries its charges but not its month's
        // furniture: no plate, no total, no flag. It is context for the weeks
        // above it, and a full-strength tile in the bottom row would read as
        // part of the month being looked at.
        cell.adjacent
          ? styles.tileAdjacent
          : past
            ? styles.tileSpent
            : styles.tileFilled,
        heavy && styles.tileHeavy,
        isToday && !selected && styles.tileToday,
        selected && styles.tileSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.number,
          past && styles.numberPast,
          cell.adjacent && styles.numberAdjacent,
          isToday && styles.numberToday,
          (isToday || selected) && styles.numberStrong,
        ]}
      >
        {cell.day}
      </Text>

      <View style={[styles.logos, cell.adjacent && styles.logosAdjacent]}>
        {events.slice(0, room).map((event) => (
          <BrandLogo
            key={event.key}
            name={event.name}
            brandDomain={event.brandDomain}
            size={logo}
            dimmed={past || cell.adjacent}
          />
        ))}
        {overflowing ? (
          <Text
            // The chip stands in a logo's place, so it has to be a logo tall —
            // which now depends on the setting.
            style={[
              styles.overflow,
              { lineHeight: logo },
              cell.adjacent && styles.numberAdjacent,
            ]}
          >{`+${events.length - room}`}</Text>
        ) : null}
      </View>

      {settings.showDayTotals && !cell.adjacent && day.total > 0 ? (
        <Text
          style={[styles.total, past && styles.totalPast]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={totalFloor}
        >
          {formatMoney(day.total, events[0]?.currencyCode ?? "", {
            decimals: 0,
          })}
        </Text>
      ) : null}

      {!cell.adjacent && events.some((event) => DOTTED[event.kind]) ? (
        <View style={styles.dot} />
      ) : null}
    </Pressable>
  );
});

/** The seven column headings. They never change within a locale. */
export const WeekdayHeader = memo(function WeekdayHeader({
  weekStart,
}: {
  weekStart: WeekStart;
}) {
  return (
    <View style={styles.week}>
      {weekdayLabels(weekStart).map((label) => (
        <Text key={label} style={styles.weekday}>
          {label}
        </Text>
      ))}
    </View>
  );
});

/**
 * One month's tiles, six rows of seven.
 *
 * Tiles are a fixed `height`, which every other box in this app is forbidden —
 * but a calendar grid is the one place where the alternative is worse: rows of
 * different heights stop being a grid, and the day number is the only text here
 * that has to fit. Logos and the total are decoration a tight tile can drop
 * (`maxIcons`, the totals switch) rather than text that must not be capped.
 *
 * `heavyDates` is null rather than empty for the common case — a free install,
 * or a month with no pile-up — so the memoised tiles below keep their identity
 * instead of taking a fresh `Set` on every render.
 */
export function MonthCells({
  cells,
  days,
  heavyDates,
  settings,
  selected,
  onSelect,
  now = new Date(),
}: {
  cells: CalendarCell[];
  days: Map<string, CalendarDayDto>;
  heavyDates: Set<string> | null;
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
            day={days.get(cell.date)}
            heavy={heavyDates?.has(cell.date) ?? false}
            settings={settings}
            selected={cell.date === selected}
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
  // No plate at all, not even the faint one a settled day keeps. The whole job
  // of a neighbouring day is to end the grid without ending the month, and a
  // filled tile in the last row makes March look like part of February.
  tileAdjacent: { backgroundColor: "transparent", borderColor: "transparent" },
  tileSpent: {
    backgroundColor: colors.surfacePast,
    borderColor: colors.borderPast,
  },
  // Below today and selection in the cascade: where the user IS beats what the
  // day contains, and a heavy day is still visible from its amber total below.
  tileHeavy: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
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
  // Below `mutedPast`, which is already the dimmest text on the screen: a
  // neighbouring day has to be legible enough to count weeks by and quiet
  // enough that nobody reads it as this month.
  numberAdjacent: { color: "rgba(152,160,174,0.38)" },
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
  // Its own charges are worth showing — a blank 1st of October at the foot of
  // September would read as "nothing due" rather than "another month" — but at
  // half strength, under the dimmed logos.
  logosAdjacent: { opacity: 0.55 },
  overflow: { fontSize: 12, fontWeight: "700", color: colors.muted },
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
