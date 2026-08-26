import { SubscriptionPeriod } from "@subeye/model";
import { StyleSheet, Text, View } from "react-native";
import type {
  SubscriptionGroupBy,
  SubscriptionSection,
} from "@/entities/subscription";
import { m } from "@/shared/i18n";
import { currencyLabel, formatMoney } from "@/shared/lib/format";
import { colors } from "@/shared/ui/theme";
import { useLargeText } from "@/shared/ui/use-large-text";

// Message-function REFERENCES, invoked at render — m.*() at module scope freezes
// the string in whichever locale was active at import.
const CADENCE: Record<string, () => string> = {
  [SubscriptionPeriod.DAY]: m.subs_cadence_daily,
  [SubscriptionPeriod.WEEK]: m.subs_cadence_weekly,
  [SubscriptionPeriod.MONTH]: m.subs_cadence_monthly,
  [SubscriptionPeriod.YEAR]: m.subs_cadence_yearly,
};

function headingFor(
  section: SubscriptionSection,
  groupBy: SubscriptionGroupBy,
): string {
  switch (groupBy) {
    case "currency":
      return currencyLabel(section.key);
    case "period":
      // The raw key is the fallback rather than a blank: a period the catalogue
      // has not learned yet should read as "quarter", not as an empty heading.
      return CADENCE[section.key]?.() ?? section.key;
    default:
      return section.label ?? m.home_uncategorized();
  }
}

/**
 * A group's name and what it costs a month.
 *
 * The total is the reason to group at all — "Yearly · ₴9,120" answers a question
 * the rows underneath cannot, however carefully you read them. It is normalised
 * monthly on both sides, so the headings are comparable to each other and to the
 * same figure on Home.
 */
export function SectionHeading({
  section,
  groupBy,
}: {
  section: SubscriptionSection;
  groupBy: SubscriptionGroupBy;
}) {
  const stacked = useLargeText();

  return (
    <View style={[styles.heading, stacked && styles.headingStacked]}>
      <Text style={styles.title}>{headingFor(section, groupBy)}</Text>
      <Text style={styles.total}>
        {formatMoney(section.total, section.currencyCode)}
        <Text style={styles.cadence}>{m.subs_perMonthSuffix()}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 6,
    paddingTop: 14,
    paddingBottom: 8,
  },
  // The total is the reason the heading exists, so it wraps under the name
  // rather than competing with it for a line neither can win.
  headingStacked: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 2,
  },
  title: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.muted,
  },
  total: {
    fontSize: 13.5,
    fontWeight: "600",
    color: colors.muted,
    fontVariant: ["tabular-nums"],
  },
  cadence: { fontSize: 11 },
});
