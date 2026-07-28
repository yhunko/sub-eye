import { SymbolView } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";
import { m } from "@/shared/i18n";
import { formatMoney } from "@/shared/lib/format";
import { colors, LAYOUT_FONT_SCALE_MAX } from "@/shared/ui/theme";

// The one number the screen is about: what is still going to leave the account
// this month, over the month's own total so the figure has a denominator.
// Kopecks are kept here (unlike the old stat trio) because this is the only big
// number left — there is nothing for it to misalign against.
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
}: {
  currency: string;
  remainingThisMonth: number;
  monthTotal: number;
  nextMonthForecast: number;
}) {
  const [whole, fraction] = splitAmount(remainingThisMonth, currency);

  // MONEY spent, not days elapsed. The bar used to track the calendar, which on
  // a month whose renewals cluster at the start reads nearly full while most of
  // the money is still ahead — the opposite of what the number above it says.
  const progress =
    monthTotal > 0
      ? Math.min(1, Math.max(0, (monthTotal - remainingThisMonth) / monthTotal))
      : 0;

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
          shrink with the headline instead of drifting off its baseline. */}
      <Text
        style={styles.amount}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
      >
        {whole}
        <Text style={styles.fraction}>{fraction}</Text>
        {monthTotal > 0 ? (
          <Text style={styles.denominator}>
            {`  / ${formatMoney(monthTotal, currency, { decimals: 0 })}`}
          </Text>
        ) : null}
      </Text>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.sub} numberOfLines={1}>
          {m.home_nextMonthForecast()}
          {" · "}
          <Text style={styles.subStrong}>
            {formatMoney(nextMonthForecast, currency, { decimals: 0 })}
          </Text>
        </Text>

        {/* The one place a brand-green amount is allowed: this is a direction,
            not a balance. Spending less next month is unambiguously the good
            outcome, and an arrow with no colour is a shape the eye skips. */}
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
                amount: formatMoney(Math.abs(delta), currency, { decimals: 0 }),
              })}
            </Text>
          </View>
        ) : null}
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
  track: {
    marginTop: 14,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 999, backgroundColor: colors.accent },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sub: { flexShrink: 1, fontSize: 13, color: colors.muted },
  subStrong: { fontSize: 15, color: colors.text, fontWeight: "700" },
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
