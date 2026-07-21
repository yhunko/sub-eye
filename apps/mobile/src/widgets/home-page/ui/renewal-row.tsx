import type { UpcomingRenewalDto } from "@subeye/shared";
import { StyleSheet, Text, View } from "react-native";
import { formatDaysUntil, formatMoney } from "@/shared/lib/format";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { colors, LAYOUT_FONT_SCALE_MAX } from "@/shared/ui/theme";

// The dashboard DTO already converts each renewal into the preferred currency and
// carries no "as charged" pair, so there is nothing to disclose here — formatMoney,
// not formatConverted. The subscriptions list row does carry both and uses the pair.
export function RenewalRow({ item }: { item: UpcomingRenewalDto }) {
  return (
    <View style={styles.row}>
      <BrandLogo name={item.name} brandDomain={item.brandDomain} size={36} />
      <View style={styles.middle}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {formatDaysUntil(item.daysUntil, item.nextPaymentDate)}
        </Text>
      </View>
      <Text
        style={styles.amount}
        numberOfLines={1}
        maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
      >
        {formatMoney(item.amount, item.currencyCode)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  middle: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  sub: { marginTop: 2, fontSize: 12.5, color: colors.muted },
  amount: { fontSize: 14, fontWeight: "700", color: colors.text },
});
