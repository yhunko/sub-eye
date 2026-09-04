import { useRouter } from "expo-router";
import { memo, useCallback } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { m } from "@/shared/i18n";
import { formatMoney } from "@/shared/lib/format";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { colors } from "@/shared/ui/theme";
import { useShrinkFloor } from "@/shared/ui/use-large-text";
import type { RailDay } from "../model/rail";

/** Home's own horizontal padding, which the rail has to escape. */
const PAGE_PADDING = 16;
/** At the default text size. Both scale with Dynamic Type — see `MonthRail`. */
const CELL = 50;
const CIRCLE = 34;
const GAP = 2;

// Fixed, and deliberately not scaled: a logo is a picture, not text, and the
// calendar's tiles keep theirs the same size at every Dynamic Type setting.
const LOGO = 22;
/** The plate each logo sits on, which is what makes the overlap read as a stack. */
const RING = LOGO + 4;
/** How far one logo slides under the one before it. */
const OVERLAP = 6;

/**
 * The block under the date — a FLOOR, so a quiet day reserves the same room a
 * charging one uses and every cell's amount lands on one line.
 *
 * Not a fixed height: at the accessibility text sizes the amount outgrows 48pt,
 * and capping it there is the thing this app never does. The cells are top
 * aligned, so a taller one grows downwards and takes the strip with it.
 */
const CHARGES_FLOOR = 48;

/**
 * A day's total, and the point size it may shrink to rather than truncate.
 *
 * A 50pt cell is about seven characters at 10.5pt, and a single annual plan in a
 * soft currency clears that on its own — the calendar's tiles hit the same wall
 * and answer it the same way. The floor is a POINT size so the room to shrink
 * into does not climb with Dynamic Type.
 */
const AMOUNT_SIZE = 10.5;
const AMOUNT_FLOOR = 8;

const RailCell = memo(function RailCell({
  day,
  currency,
  cell,
  circle,
  amountFloor,
  onOpen,
}: {
  day: RailDay;
  currency: string;
  cell: number;
  circle: number;
  amountFloor: number;
  onOpen: (date: string) => void;
}) {
  const amount =
    day.amount > 0 ? formatMoney(day.amount, currency, { decimals: 0 }) : null;

  // A cell opens the day sheet only when it is HIDING something. At two charges
  // or fewer the logos and the total already say everything the sheet would, so
  // a tap there is a navigation that costs the user a dismissal to learn
  // nothing — and it keeps thirty press responders off a horizontal scroller
  // that has to stay light under a finger.
  const opens = day.hidden > 0;

  const label = [
    day.today ? m.when_today() : day.spoken,
    amount,
    // The "+N" chip is a glyph; spelled out, it is the reason to tap.
    opens ? m.home_railMore({ count: day.hidden }) : null,
  ]
    .filter(Boolean)
    .join(", ");

  const body = (
    <>
      <Text style={styles.weekday}>{day.weekday}</Text>
      <View
        style={[
          styles.date,
          { width: circle, height: circle, borderRadius: circle / 2 },
          day.today && styles.dateToday,
          day.next && styles.dateNext,
        ]}
      >
        <Text
          style={[
            styles.number,
            day.today && styles.numberToday,
            day.next && styles.numberNext,
          ]}
        >
          {day.day}
        </Text>
      </View>

      <View style={styles.charges}>
        {day.logos.length ? (
          <>
            <View style={styles.logos}>
              {day.logos.map((logo) => (
                <View key={logo.key} style={styles.ring}>
                  <BrandLogo
                    name={logo.name}
                    brandDomain={logo.brandDomain}
                    size={LOGO}
                  />
                </View>
              ))}
              {day.hidden ? (
                <View style={styles.overflow}>
                  <Text style={styles.overflowText}>{`+${day.hidden}`}</Text>
                </View>
              ) : null}
            </View>
            {/* One line, always: the figure is a glance, and a wrapped
                  "₴1,2" / "34" is worse than the shrink. */}
            <Text
              style={styles.amount}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={amountFloor}
            >
              {amount}
            </Text>
          </>
        ) : null}
      </View>
    </>
  );

  return (
    <View style={styles.slot}>
      {/* A hairline, not a gap: the weeks have to be countable without the
          strip growing a second row of headings to count them by. */}
      {day.weekBreak ? <View style={styles.weekBreak} /> : null}
      {opens ? (
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={() => onOpen(day.date)}
          style={({ pressed }) => [
            styles.cell,
            { width: cell },
            pressed && styles.pressed,
          ]}
        >
          {body}
        </Pressable>
      ) : (
        // One label per cell either way, replacing the two-letter heading a
        // screen reader would otherwise spell out.
        <View
          style={[styles.cell, { width: cell }]}
          accessible
          accessibilityLabel={label}
        >
          {body}
        </View>
      )}
    </View>
  );
});

/**
 * The rest of this month, day by day — the only thing on Home that differs
 * between two opens on consecutive days.
 *
 * A plain horizontal `ScrollView` with every cell mounted, not a virtualised
 * list: a month is at most 31 cells of two `Text`s and a couple of images, and
 * virtualising that buys nothing while costing the blank cells a fling past the
 * windowing threshold puts on screen. Each cell is memoised and `buildRail`'s
 * output is stable, so a repaint of the page below does not touch the strip.
 *
 * Today is the FIRST cell, which is why there is no scroll-to on mount: the
 * strip opens where the user is, and the days behind them are settled money
 * accounted for by the bar under the hero.
 */
export function MonthRail({
  days,
  currency,
}: {
  days: RailDay[];
  currency: string;
}) {
  const router = useRouter();
  // The circle has to grow with the number inside it, and the cell with the
  // circle — the same arithmetic the attention rail does for its cards.
  const { fontScale } = useWindowDimensions();
  const scale = Math.max(1, fontScale);
  const cell = Math.round(CELL * scale);
  const circle = Math.round(CIRCLE * scale);
  // Resolved once for the whole strip rather than per cell: `useShrinkFloor`
  // subscribes to window dimensions, and thirty-one subscriptions to answer one
  // question is thirty listeners for nothing.
  const amountFloor = useShrinkFloor(AMOUNT_SIZE, AMOUNT_FLOOR);

  // The calendar's own day sheet, from the ROOT route rather than the
  // calendar's stack — pushed from here, a route inside that stack would switch
  // the tab bar to Calendar underneath the sheet. `YYYY-MM-DD`, because a full
  // ISO instant carries colons and those have no business in a path segment.
  const openDay = useCallback(
    (date: string) =>
      router.push({
        pathname: "/day/[date]",
        params: { date: date.slice(0, 10) },
      }),
    [router],
  );

  return (
    <View style={styles.rail}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // The page's vertical scroll view takes UIKit's automatic safe-area
        // inset. Without this the nested horizontal one takes it too and starts
        // the strip pushed in by the status bar's height.
        automaticallyAdjustContentInsets={false}
        contentContainerStyle={styles.content}
      >
        {days.map((day) => (
          <RailCell
            key={day.date}
            day={day}
            currency={currency}
            cell={cell}
            circle={circle}
            amountFloor={amountFloor}
            onOpen={openDay}
          />
        ))}
      </ScrollView>

      {/* The strip runs off both edges of the page, and a cell cut in half by
          the bezel reads as a rendering fault rather than as "there is more".
          A wash to the page background is the same picture a CSS mask would
          draw and costs no library — `experimental_backgroundImage` is core RN,
          the detail banner's scrim uses it too. Left is inside the page padding
          at rest, so today's cell is never dimmed. */}
      <View pointerEvents="none" style={styles.fadeStart} />
      <View pointerEvents="none" style={styles.fadeEnd} />
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { marginHorizontal: -PAGE_PADDING, paddingBottom: 14 },
  content: {
    paddingHorizontal: PAGE_PADDING,
    alignItems: "flex-start",
    gap: GAP,
  },
  fadeStart: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: PAGE_PADDING,
    experimental_backgroundImage:
      "linear-gradient(90deg, rgba(15,17,21,1) 0%, rgba(15,17,21,0) 100%)",
  },
  // Wider than the leading fade: this end is the one that has to say a cell is
  // continuing past it, and half a cell is what makes that legible.
  fadeEnd: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: 34,
    experimental_backgroundImage:
      "linear-gradient(270deg, rgba(15,17,21,1) 0%, rgba(15,17,21,0) 100%)",
  },
  slot: { flexDirection: "row", alignItems: "stretch" },
  pressed: { opacity: 0.55 },
  weekBreak: {
    width: StyleSheet.hairlineWidth,
    marginTop: 4,
    marginHorizontal: 5,
    backgroundColor: colors.border,
  },
  cell: { alignItems: "center", gap: 7 },
  // Cased and spaced to match the calendar's own weekday header — the strip and
  // the grid name the same seven days and used to disagree about how.
  weekday: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.muted,
  },
  // Square by definition, and sized in `MonthRail` off `fontScale` rather than
  // fixed here — the number inside grows with Dynamic Type and a constant box
  // would be the cap this app does not do.
  date: { alignItems: "center", justifyContent: "center" },
  dateToday: { backgroundColor: colors.accent },
  // A RING for the next charge, against today's fill. Two fills competing on one
  // strip is what made "where you are" and "what is coming" the same signal.
  dateNext: { borderWidth: 2, borderColor: colors.accent },
  number: { fontSize: 17, fontWeight: "600", color: colors.text },
  // Near-black on #33a453 is 5.92:1; white on it is 3.19:1 and fails.
  numberToday: { fontWeight: "700", color: colors.bg },
  numberNext: { fontWeight: "700", color: colors.accentBright },
  charges: { minHeight: CHARGES_FLOOR, alignItems: "center", gap: 4 },
  // Cancels the first logo's own negative margin, so a single logo still sits
  // centred under its date.
  logos: { flexDirection: "row", alignItems: "center", marginLeft: OVERLAP },
  ring: {
    // Above the overflow chip, so the chip tucks BEHIND the last logo rather
    // than drawing its border across it.
    zIndex: 2,
    marginLeft: -OVERLAP,
    padding: 2,
    borderRadius: RING / 2,
    // The page background, not the card's: the plate is what separates one logo
    // from the one it overlaps, and it has to match what is behind the strip.
    backgroundColor: colors.bg,
  },
  overflow: {
    zIndex: 1,
    marginLeft: -8,
    // Floors, not sizes. The left padding is the overlap paid back, which is
    // what keeps the count clear of the logo tucked under it.
    minWidth: 28,
    minHeight: 24,
    paddingLeft: 8,
    paddingRight: 4,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overflowText: { fontSize: 10, fontWeight: "700", color: colors.text },
  amount: { fontSize: AMOUNT_SIZE, fontWeight: "600", color: colors.muted },
});
