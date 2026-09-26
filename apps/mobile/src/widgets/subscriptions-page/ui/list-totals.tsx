import { StyleSheet, Text, View } from "react-native";
import { m } from "@/shared/i18n";
import { formatMoney } from "@/shared/lib/format";
import { colors } from "@/shared/ui/theme";
import { useLargeText, useShrinkFloor } from "@/shared/ui/use-large-text";

const VALUE_SIZE = 22;
const VALUE_FLOOR = 15;

function Total({
  label,
  value,
  floor,
}: {
  label: string;
  value: string;
  floor: number;
}) {
  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`${label}, ${value}`}
    >
      <Text style={styles.label}>{label}</Text>
      <Text
        style={styles.value}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={floor}
      >
        {value}
      </Text>
    </View>
  );
}

/**
 * What the whole list costs, above the list.
 *
 * Both figures are the dashboard's own — the same `monthlyBurnRate` the detail
 * screen divides a subscription's share by, and the same `yearlyForecast` Home
 * prints as its twelve-month rung. Summing the rows here instead would be a
 * second projection of a number the app already computes once, and the two would
 * disagree the first time a phase change landed between them.
 *
 * The year stays a PROJECTION and says so: it is the charges that actually land
 * in the next twelve months, not a monthly rate times twelve, so a plan that
 * lapses in March contributes only the months it survives.
 */
export function ListTotals({
  currency,
  monthly,
  yearly,
}: {
  currency: string;
  monthly: number;
  yearly: number;
}) {
  // Side by side is two figures compared; stacked, they are two facts read in
  // turn. Past the accessibility sizes there is no width left to compare in.
  const stacked = useLargeText();
  const floor = useShrinkFloor(VALUE_SIZE, VALUE_FLOOR);

  return (
    <View style={[styles.row, stacked && styles.rowStacked]}>
      <Total
        label={m.subs_totalMonthly()}
        value={formatMoney(monthly, currency, { decimals: 0 })}
        floor={floor}
      />
      <Total
        label={m.subs_totalYearly()}
        value={formatMoney(yearly, currency, { decimals: 0 })}
        floor={floor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10, paddingBottom: 14 },
  rowStacked: { flexDirection: "column" },
  card: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  // `lineHeight` is NOT styling — unset, iOS under-measures an 11.5pt frame at
  // the accessibility text sizes and clips the top of the line.
  label: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    marginTop: 4,
    fontSize: VALUE_SIZE,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: colors.text,
  },
});
