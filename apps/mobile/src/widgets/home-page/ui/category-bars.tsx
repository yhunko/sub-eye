import type { CategorySpendingDto } from "@subeye/shared";
import { StyleSheet, Text, View } from "react-native";
import { m } from "@/shared/i18n";
import { formatMoney } from "@/shared/lib/format";
import {
  categoryColors,
  colors,
  LAYOUT_FONT_SCALE_MAX,
} from "@/shared/ui/theme";

// Bars, not a donut: seven categories where one is 80% is unreadable as a pie,
// and a bar row carries name, share and amount on the line the eye is already on.
export function CategoryBars({
  currency,
  categories,
}: {
  currency: string;
  categories: CategorySpendingDto[];
}) {
  const total = categories.reduce((sum, item) => sum + item.amount, 0);
  if (total <= 0) return null;

  return (
    <View style={styles.card}>
      {categories.map((item, index) => {
        const share = (item.amount / total) * 100;
        const color = categoryColors[index % categoryColors.length];
        return (
          <View key={item.categoryId ?? "uncategorized"} style={styles.row}>
            <View style={styles.line}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <Text style={styles.name} numberOfLines={1}>
                {item.name || m.home_uncategorized()}
              </Text>
              <Text
                style={styles.share}
                maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
              >
                {share.toFixed(1)}%
              </Text>
              <Text
                style={styles.amount}
                numberOfLines={1}
                maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
              >
                {formatMoney(item.amount, currency)}
              </Text>
            </View>
            {/* A 0.4% category still gets a visible stub — an invisible bar
                reads as a rendering bug, not as "this one is tiny". */}
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${Math.max(share, 2)}%`, backgroundColor: color },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  row: { paddingVertical: 10, paddingHorizontal: 2 },
  line: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 9, height: 9, borderRadius: 999 },
  name: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: "500",
    color: colors.text,
  },
  share: { fontSize: 12.5, color: colors.muted },
  amount: {
    minWidth: 78,
    textAlign: "right",
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  track: {
    marginTop: 8,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 999 },
});
