import { StyleSheet, Text, View } from "react-native";
import { m } from "@/shared/i18n";
import { formatMoney } from "@/shared/lib/format";
import { colors, LAYOUT_FONT_SCALE_MAX } from "@/shared/ui/theme";

// The one number the screen is about: what is still going to leave the account
// this month, with the month's own progress underneath so the figure has a
// denominator. Kopecks are kept here (unlike the old stat trio) because this is
// the only big number left — there is nothing for it to misalign against.
function splitAmount(value: number, currency: string): [string, string] {
  const text = formatMoney(value, currency);
  const dot = text.lastIndexOf(".");
  return dot === -1 ? [text, ""] : [text.slice(0, dot), text.slice(dot)];
}

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
  const delta = nextMonthForecast - monthTotal;
  const deltaText =
    Math.abs(delta) < 1
      ? null
      : `${delta > 0 ? "+" : "−"}${formatMoney(Math.abs(delta), currency, {
          decimals: 0,
        })}`;

  return (
    <View style={styles.card}>
      <Text style={styles.label} maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}>
        {m.home_remainingThisMonth()}
      </Text>
      <Text
        style={styles.amount}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
      >
        {whole}
        <Text style={styles.fraction}>{fraction}</Text>
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
        {/* Red for more, muted for less — never green. Every amount here is
            money leaving, so "cheaper" is not a win worth a brand colour. */}
        {deltaText ? (
          <Text
            style={[styles.sub, delta > 0 && styles.deltaUp]}
            numberOfLines={1}
            maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
          >
            {deltaText} {m.home_vsThisMonth()}
          </Text>
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
  track: {
    marginTop: 14,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 999, backgroundColor: colors.accent },
  footer: {
    marginTop: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sub: { fontSize: 12.5, color: colors.muted },
  subStrong: { color: colors.text, fontWeight: "600" },
  deltaUp: { color: colors.danger },
});
