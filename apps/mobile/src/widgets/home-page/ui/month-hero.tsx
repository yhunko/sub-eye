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
  nextMonthForecast,
}: {
  currency: string;
  remainingThisMonth: number;
  nextMonthForecast: number;
}) {
  const [whole, fraction] = splitAmount(remainingThisMonth, currency);

  // ponytail: the device's calendar, not the dashboard's `timezone`. Hermes has
  // no guaranteed IANA support in Intl, and the two disagree for at most a few
  // hours a month on a progress bar. Thread `timezone` through if that ever bites.
  const now = new Date();
  const total = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const elapsed = now.getDate();

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
        <View style={[styles.fill, { width: `${(elapsed / total) * 100}%` }]} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.sub} numberOfLines={1}>
          {m.home_daysElapsed({ elapsed, total })}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {m.home_nextMonthForecast()}
          {" · "}
          <Text style={styles.subStrong}>
            {formatMoney(nextMonthForecast, currency, { decimals: 0 })}
          </Text>
        </Text>
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
});
