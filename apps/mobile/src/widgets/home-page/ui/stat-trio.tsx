import { StyleSheet, Text, View } from "react-native";
import { formatMoney } from "@/shared/lib/format";
import { colors, LAYOUT_FONT_SCALE_MAX } from "@/shared/ui/theme";

// Whole units only. These are scanning numbers — kopecks on a ₴38,400/yr forecast
// are noise, and they are what force the font size down on narrow screens.
function Stat({
  label,
  amount,
  currency,
}: {
  label: string;
  amount: number;
  currency: string;
}) {
  return (
    <View style={styles.stat}>
      <Text
        style={styles.label}
        numberOfLines={1}
        maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
      >
        {label}
      </Text>
      <Text
        style={styles.value}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
      >
        {formatMoney(amount, currency, { decimals: 0 })}
      </Text>
    </View>
  );
}

export function StatTrio({
  currency,
  yearlyForecast,
  monthlyBurnRate,
  remainingThisMonth,
  labels,
}: {
  currency: string;
  yearlyForecast: number;
  monthlyBurnRate: number;
  remainingThisMonth: number;
  labels: { yearly: string; monthly: string; remaining: string };
}) {
  return (
    <View style={styles.wrap}>
      <Stat label={labels.yearly} amount={yearlyForecast} currency={currency} />
      <View style={styles.divider} />
      <View style={styles.pair}>
        <Stat
          label={labels.monthly}
          amount={monthlyBurnRate}
          currency={currency}
        />
        <Stat
          label={labels.remaining}
          amount={remainingThisMonth}
          currency={currency}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  pair: {
    flexDirection: "row",
    gap: 16,
  },
  stat: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  label: {
    fontSize: 12.5,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  value: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
  },
});
