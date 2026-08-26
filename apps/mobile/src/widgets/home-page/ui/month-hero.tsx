import { SymbolView } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";
import { m } from "@/shared/i18n";
import { formatMoney } from "@/shared/lib/format";
import { colors, LAYOUT_FONT_SCALE_MAX } from "@/shared/ui/theme";

// Three horizons, tightest first: what is still to leave this month, what next
// month costs, what the next year costs. The ladder is the structure — each rung
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
   * months it survives, which is why the label says "next 12 months" rather
   * than "per year": this is a projection, not a rate.
   */
  yearForecast: number;
}) {
  const [whole, fraction] = splitAmount(remainingThisMonth, currency);

  // The absolute forecast alone says nothing; the delta is the whole signal, and
  // it is the honest version of what the old six-bar trend was reaching for —
  // change happens at a specific month, not across a flat series.
  //
  // Rounded to whole units before the comparison, because the chip prints whole
  // units: a 40-kopeck drift would otherwise render an arrow next to "0 less".
  const delta = Math.round(nextMonthForecast) - Math.round(monthTotal);
  const up = delta > 0;

  return (
    <View style={styles.card}>
      <Text style={styles.label} maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}>
        {m.home_remainingThisMonth()}
      </Text>

      {/* One Text, nested spans — not a row of three. adjustsFontSizeToFit
          scales a single line as a unit, so the denominator and the kopecks
          shrink with the headline instead of drifting off its baseline.

          The denominator replaced a progress bar that drew this same ratio in
          green, which on a spend tracker filled up as money left — a goal
          metaphor pointing the wrong way. One representation of one fact. */}
      <Text
        style={styles.amount}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
        // The denominator is punctuation on screen and nothing in speech —
        // VoiceOver reads the separator as "slash", which turns a ratio into
        // two unrelated prices. Spell the relationship out instead.
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
        {monthTotal > 0 ? (
          <Text style={styles.denominator}>
            {`  / ${formatMoney(monthTotal, currency, { decimals: 0 })}`}
          </Text>
        ) : null}
      </Text>

      <View style={styles.band}>
        <View style={styles.horizon}>
          <Text
            style={styles.horizonLabel}
            numberOfLines={1}
            maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
          >
            {m.home_nextMonthForecast()}
          </Text>
          {/* Wraps rather than truncates: on a 320pt screen the chip does not
              fit beside the figure, and a clipped "₴150 mo…" is worse than a
              card one line taller on the one phone that needs it. */}
          <View style={styles.horizonValueRow}>
            <Text
              style={styles.horizonValue}
              numberOfLines={1}
              maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
            >
              {formatMoney(nextMonthForecast, currency, { decimals: 0 })}
            </Text>

            {/* The one place a brand-green amount is allowed: this is a
                direction, not a balance. Spending less next month is
                unambiguously the good outcome, and an arrow with no colour is a
                shape the eye skips. */}
            {delta !== 0 ? (
              <View style={[styles.chip, up ? styles.chipUp : styles.chipDown]}>
                <SymbolView
                  name={up ? ARROW.up : ARROW.down}
                  size={10}
                  weight="bold"
                  tintColor={up ? colors.danger : colors.accent}
                />
                <Text
                  style={[
                    styles.chipText,
                    { color: up ? colors.danger : colors.accent },
                  ]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
                >
                  {(up ? m.home_deltaMore : m.home_deltaLess)({
                    amount: formatMoney(Math.abs(delta), currency, {
                      decimals: 0,
                    }),
                  })}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.horizon}>
          <Text
            style={styles.horizonLabel}
            numberOfLines={1}
            maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
          >
            {m.home_yearForecast()}
          </Text>
          <View style={styles.horizonValueRow}>
            <Text
              style={styles.horizonValue}
              numberOfLines={1}
              maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
            >
              {formatMoney(yearForecast, currency, { decimals: 0 })}
            </Text>
          </View>
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
  label: {
    fontSize: 12.5,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  amount: {
    marginTop: 6,
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: -1,
    color: colors.text,
  },
  fraction: { fontSize: 24, fontWeight: "700", color: colors.muted },
  denominator: { fontSize: 22, fontWeight: "700", color: colors.muted },
  band: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    flexDirection: "row",
    gap: 12,
  },
  horizon: { flex: 1, minWidth: 0 },
  horizonLabel: {
    fontSize: 11.5,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  horizonValueRow: {
    marginTop: 4,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: 6,
    rowGap: 4,
  },
  horizonValue: { fontSize: 16, fontWeight: "700", color: colors.text },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipUp: { backgroundColor: colors.dangerSoft },
  chipDown: { backgroundColor: colors.accentSoft },
  chipText: { fontSize: 12.5, fontWeight: "700" },
});
