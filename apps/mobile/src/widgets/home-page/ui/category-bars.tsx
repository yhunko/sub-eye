import type { CategorySpendingDto } from "@subeye/model";
import { StyleSheet, Text, View } from "react-native";
import { m } from "@/shared/i18n";
import { formatMoney } from "@/shared/lib/format";
import { categoryColors, colors } from "@/shared/ui/theme";
import { useLargeText } from "@/shared/ui/use-large-text";

function Figures({ share, amount }: { share: number; amount: string }) {
  return (
    <>
      <Text style={styles.share}>{share.toFixed(1)}%</Text>
      <Text style={styles.amount}>{amount}</Text>
    </>
  );
}

// Bars, not a donut: seven categories where one is 80% is unreadable as a pie,
// and a bar row carries name, share and amount on the line the eye is already on.
export function CategoryBars({
  currency,
  categories,
}: {
  currency: string;
  categories: CategorySpendingDto[];
}) {
  // The two figures drop below the name at the accessibility text sizes — three
  // things across a phone is already tight at 15pt and impossible at 53.
  const stacked = useLargeText();

  const total = categories.reduce((sum, item) => sum + item.amount, 0);
  if (total <= 0) return null;

  return (
    <View style={styles.card}>
      {categories.map((item, index) => {
        const share = (item.amount / total) * 100;
        const amount = formatMoney(item.amount, currency);
        const color = categoryColors[index % categoryColors.length];
        return (
          <View
            key={item.categoryId ?? "uncategorized"}
            style={styles.row}
            // Four fragments on screen are one fact in speech. Ungrouped,
            // VoiceOver hands the name, the share and the amount over as three
            // separate swipes and the bar as nothing at all.
            accessible
            accessibilityLabel={[
              item.name || m.home_uncategorized(),
              `${share.toFixed(1)}%`,
              formatMoney(item.amount, currency),
            ].join(", ")}
          >
            <View style={styles.line}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <Text style={styles.name}>
                {item.name || m.home_uncategorized()}
              </Text>
              {stacked ? null : <Figures share={share} amount={amount} />}
            </View>
            {stacked ? (
              <View style={styles.figuresLine}>
                <Figures share={share} amount={amount} />
              </View>
            ) : null}
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
  // The figures' own line, once they no longer fit on the name's. Indented past
  // the dot so the row still reads as one thing.
  figuresLine: {
    flexDirection: "row",
    alignItems: "baseline",
    // The amount takes a line of its own before it breaks in half: "₴4,237." /
    // "09" is a number a spend tracker has no business printing.
    flexWrap: "wrap",
    columnGap: 10,
    rowGap: 2,
    marginTop: 4,
    marginLeft: 19,
  },
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
    // A FLOOR, not a width: right-aligned it keeps the amounts in a column at
    // the default size, and it still grows past 78 when the text does.
    minWidth: 78,
    flexShrink: 1,
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
