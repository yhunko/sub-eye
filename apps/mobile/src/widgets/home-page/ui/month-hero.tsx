import { SymbolView } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";
import { m } from "@/shared/i18n";
import { formatMoney } from "@/shared/lib/format";
import { colors } from "@/shared/ui/theme";
import { useLargeText, useShrinkFloor } from "@/shared/ui/use-large-text";

// The headline's design size, and the point size it may never shrink past.
//
// 30, not the 42 this card carried while it opened the screen. What is left this
// month is a figure that decays to zero by the 30th and that no decision changes
// — it earns a card, not the loudest type on the page. The band above it, which a
// user can still act on, now takes that weight.
const AMOUNT_SIZE = 30;
const AMOUNT_FLOOR = 22;
const DENOMINATOR_SIZE = 12.5;
const DENOMINATOR_FLOOR = 11;

/** The narrowest the bar may draw, so a first-of-the-month stub is still visible. */
const MIN_FILL = "3%";

// Three horizons, tightest first: what is still to leave this month, what next
// month costs, what a year of this costs. The ladder is the structure — each rung
// is one label and one number, and the nearest rung gets the headline because it
// is the only one a user can still act on.
//
// Kopecks survive on the headline only. It is the one figure precise enough to
// reconcile against a bank app; a forecast printed to the kopeck is false
// precision dressed as rigour.
function splitAmount(value: number, currency: string): [string, string] {
  const text = formatMoney(value, currency);
  const dot = text.lastIndexOf(".");
  return dot === -1 ? [text, ""] : [text.slice(0, dot), text.slice(dot)];
}

const ARROW = {
  up: { ios: "arrow.up", android: "arrow_upward" },
  down: { ios: "arrow.down", android: "arrow_downward" },
} as const;

export function MonthHero({
  currency,
  remainingThisMonth,
  monthTotal,
  nextMonthForecast,
  yearForecast,
}: {
  currency: string;
  remainingThisMonth: number;
  monthTotal: number;
  nextMonthForecast: number;
  /**
   * The charges that actually land in the next twelve months — NOT a monthly
   * figure multiplied by twelve. A plan that lapses in March contributes the
   * months it survives, which is why the label calls it an ESTIMATE: this is a
   * projection, not a rate.
   */
  yearForecast: number;
}) {
  const [whole, fraction] = splitAmount(remainingThisMonth, currency);

  // The absolute forecast alone says nothing; the delta is the whole signal, and
  // it is the honest version of what the old six-bar trend was reaching for —
  // change happens at a specific month, not across a flat series.
  //
  // Rounded to whole units before the comparison, because the line prints whole
  // units: a 40-kopeck drift would otherwise render an arrow next to "0 less".
  const delta = Math.round(nextMonthForecast) - Math.round(monthTotal);
  const up = delta > 0;

  const stacked = useLargeText();
  const amountFloor = useShrinkFloor(AMOUNT_SIZE, AMOUNT_FLOOR);
  const denominatorFloor = useShrinkFloor(DENOMINATOR_SIZE, DENOMINATOR_FLOOR);
  const denominator =
    monthTotal > 0
      ? m.home_remainingOf({
          total: formatMoney(monthTotal, currency, { decimals: 0 }),
        })
      : null;

  // What has already gone, off the two figures printed above rather than a walk
  // over the forecast: a bar that disagreed with the headline it sits under
  // would be worse than no bar.
  const charged = Math.max(0, monthTotal - remainingThisMonth);

  return (
    <View style={styles.card}>
      {/* What is left and what has gone, on one line: they are the two halves
          of the same month, and the label had a whole line to itself while the
          figure that completes it sat four rows below the bar. */}
      <View style={[styles.head, stacked && styles.headStacked]}>
        <Text style={styles.label}>{m.home_remainingThisMonth()}</Text>
        {monthTotal > 0 ? (
          <Text style={styles.charged} numberOfLines={1}>
            {m.home_chargedSoFar({ amount: formatMoney(charged, currency) })}
          </Text>
        ) : null}
      </View>

      {/* One Text, nested spans — not a row of three. adjustsFontSizeToFit
          scales a single line as a unit, so the denominator and the kopecks
          shrink with the headline instead of drifting off its baseline.

          It leaves the line at the accessibility text sizes, and only there:
          twenty characters of headline can only cross a phone by shrinking past
          what the DEFAULT setting already renders, which is the setting arriving
          and making the number smaller. Alone, the amount keeps its growth. */}
      <Text
        style={styles.amount}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={amountFloor}
        // Already the whole sentence in speech, so the bar and the caption below
        // are marked decorative rather than read out a second time.
        accessibilityLabel={
          monthTotal > 0
            ? m.home_remainingOfTotal({
                remaining: formatMoney(remainingThisMonth, currency),
                total: formatMoney(monthTotal, currency, { decimals: 0 }),
              })
            : undefined
        }
      >
        {whole}
        <Text style={styles.fraction}>{fraction}</Text>
        {denominator && !stacked ? (
          <Text style={styles.denominator}>{`  ${denominator}`}</Text>
        ) : null}
      </Text>
      {denominator && stacked ? (
        // Already spoken by the headline's accessibilityLabel above, so this
        // repeat is for the eye only.
        <Text
          style={[styles.denominator, styles.denominatorStacked]}
          // One line, or the ratio breaks and "of" sits alone on a line of its
          // own reading as nothing at all.
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={denominatorFloor}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {denominator}
        </Text>
      ) : null}

      {/* A bar that fills as money is CHARGED, in neutral ink.
          An earlier version of this drew the REMAINDER, in green — a spend
          tracker whose progress bar completed as money left, which is a goal
          metaphor pointing the wrong way. Same two figures, read forwards:
          the month is a bill being paid down, and this is how far through it is.
          The caption names the part the headline does not, so nothing here is
          the same fact twice. */}
      {monthTotal > 0 ? (
        // The one thing here that says nothing the words above do not: the bar
        // is the shape of the ratio, and in speech a ratio is the sentence the
        // headline already carries.
        <View
          style={styles.track}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View
            style={[
              styles.fill,
              { width: `${(charged / monthTotal) * 100}%`, minWidth: MIN_FILL },
            ]}
          />
        </View>
      ) : null}

      <View style={[styles.band, stacked && styles.bandStacked]}>
        <View style={styles.horizon}>
          <Text style={styles.horizonLabel}>{m.home_nextMonthForecast()}</Text>
          <Text style={styles.horizonValue}>
            {formatMoney(nextMonthForecast, currency, { decimals: 0 })}
          </Text>

          {/* The one place a brand-green amount is allowed: this is a direction,
              not a balance. Spending less next month is unambiguously the good
              outcome, and an arrow with no colour is a shape the eye skips.

              The words carry the direction as well as the arrow does, which is
              what a screen reader gets — the glyph is invisible to it, and a
              bare "₴150" would be a figure with no sign. */}
          {delta === 0 ? (
            <Text style={styles.horizonNote}>{m.home_deltaNone()}</Text>
          ) : (
            <View style={styles.delta}>
              <SymbolView
                name={up ? ARROW.up : ARROW.down}
                size={11}
                weight="bold"
                tintColor={up ? colors.danger : colors.accent}
              />
              <Text
                style={[
                  styles.deltaText,
                  { color: up ? colors.danger : colors.accent },
                ]}
              >
                {(up ? m.home_deltaMore : m.home_deltaLess)({
                  amount: formatMoney(Math.abs(delta), currency, {
                    decimals: 0,
                  }),
                })}
              </Text>
            </View>
          )}
        </View>

        {/* Only across a row. Stacked, a 1pt-tall rule between two blocks reads
            as a rendering artefact. */}
        {stacked ? null : <View style={styles.divider} />}

        <View style={styles.horizon}>
          <Text style={styles.horizonLabel}>{m.home_yearlyEstimate()}</Text>
          <Text style={styles.horizonValue}>
            {formatMoney(yearForecast, currency, { decimals: 0 })}
          </Text>
          {/* The same projection in the unit the rest of the screen is in —
              a twelfth of the figure above it, not `monthlyBurnRate`, which is
              today's run rate and a different number the moment anything lapses. */}
          <Text style={styles.horizonNote}>
            {m.home_perMonthApprox({
              amount: formatMoney(yearForecast / 12, currency, { decimals: 0 }),
            })}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
  },
  // `lineHeight` on a 12.5pt label is NOT styling — it is what stops the glyphs
  // being clipped. Left unset, iOS under-measures the frame at the accessibility
  // text sizes and draws the line taller than the box it was given: at
  // AX-XXXL this label lost its whole top half, silently, and only there.
  label: {
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  amount: {
    marginTop: 6,
    fontSize: AMOUNT_SIZE,
    fontWeight: "800",
    letterSpacing: -1.4,
    color: colors.text,
  },
  // `letterSpacing: 0` is LOAD-BEARING on both. A nested Text inherits the
  // headline's -1.4, which at these sizes crushes the glyphs into each other —
  // and because the hryvnia sign is two horizontal bars, the denominator came
  // out looking struck through.
  fraction: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0,
    color: colors.muted,
  },
  denominator: {
    fontSize: DENOMINATOR_SIZE,
    letterSpacing: 0,
    color: colors.muted,
  },
  denominatorStacked: { marginTop: 2 },
  track: {
    marginTop: 14,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 999, backgroundColor: colors.text },
  head: {
    flexDirection: "row",
    // The uppercase label and the sentence beside it sit on one baseline; their
    // cap heights differ, so aligning the boxes would leave the two adrift.
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  // Two lines of text across a phone stop fitting well before the accessibility
  // sizes are done with them — the same switch the horizons below make.
  headStacked: { flexDirection: "column", alignItems: "flex-start", gap: 2 },
  // Same reason as `label` above.
  charged: {
    flexShrink: 1,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.muted,
  },
  band: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    flexDirection: "row",
  },
  // Two horizons across half a phone each is fine until an 11.5pt label is
  // 41pt; then neither column holds a word.
  bandStacked: { flexDirection: "column", gap: 16 },
  horizon: { flex: 1, minWidth: 0 },
  horizonLabel: {
    fontSize: 11.5,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  horizonValue: {
    marginTop: 4,
    fontSize: 19,
    fontWeight: "700",
    color: colors.text,
  },
  horizonNote: { marginTop: 5, fontSize: 11.5, color: colors.muted },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    marginHorizontal: 16,
    backgroundColor: colors.border,
  },
  delta: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  deltaText: { flexShrink: 1, fontSize: 11.5, fontWeight: "600" },
});
