import type { MostExpensiveSubscriptionDto } from "@subeye/shared";
import { StyleSheet, Text, View } from "react-native";
import { m } from "@/shared/i18n";
import { formatMoney } from "@/shared/lib/format";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { colors, LAYOUT_FONT_SCALE_MAX } from "@/shared/ui/theme";

// The single line that most often changes a mind: the yearly cost of the one
// subscription doing the most damage. Yearly, not monthly — ₴64,365/yr lands
// where ₴5,364/mo does not.
export function TopSubscription({
  currency,
  item,
}: {
  currency: string;
  item: MostExpensiveSubscriptionDto;
}) {
  return (
    <View style={styles.card}>
      <BrandLogo name={item.name} brandDomain={item.brandDomain} size={44} />
      <View style={styles.middle}>
        <Text
          style={styles.label}
          maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
        >
          {m.home_mostExpensive()}
        </Text>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
      </View>
      <View style={styles.right}>
        <Text
          style={styles.amount}
          numberOfLines={1}
          maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
        >
          {formatMoney(item.yearlyAmount, currency, { decimals: 0 })}
        </Text>
        <Text style={styles.per} maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}>
          {m.home_perYear()}
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
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  middle: { flex: 1, minWidth: 0 },
  label: {
    fontSize: 12.5,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  name: {
    marginTop: 3,
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  right: { alignItems: "flex-end" },
  amount: {
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: colors.text,
  },
  per: { fontSize: 12.5, color: colors.muted },
});
