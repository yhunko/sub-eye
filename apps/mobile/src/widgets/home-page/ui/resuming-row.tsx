import type { ResumingSoonDto } from "@subeye/shared";
import { StyleSheet, Text, View } from "react-native";
import { daysUntil, formatDaysUntil, formatMoney } from "@/shared/lib/format";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { colors, LAYOUT_FONT_SCALE_MAX } from "@/shared/ui/theme";

// A pause the user forgot about is an unplanned charge — this row exists to make
// the resume date impossible to miss, so the date is the accent-coloured element.
//
// Unlike UpcomingRenewalDto, ResumingSoonDto carries no server-computed daysUntil,
// so the bucket is derived locally from resumeAt.
export function ResumingRow({ item }: { item: ResumingSoonDto }) {
  return (
    <View style={styles.row}>
      <BrandLogo name={item.name} brandDomain={item.brandDomain} size={36} />
      <View style={styles.middle}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.resume} numberOfLines={1}>
          {formatDaysUntil(daysUntil(item.resumeAt), item.resumeAt)}
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
  resume: {
    marginTop: 2,
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.accent,
  },
  amount: { fontSize: 14, fontWeight: "700", color: colors.text },
});
