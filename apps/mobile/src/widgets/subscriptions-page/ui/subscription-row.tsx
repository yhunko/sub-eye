import type { SubscriptionDto, SubscriptionStatus } from "@subeye/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { m } from "@/shared/i18n";
import {
  daysUntil,
  formatConverted,
  formatDaysUntil,
} from "@/shared/lib/format";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { colors, LAYOUT_FONT_SCALE_MAX } from "@/shared/ui/theme";

// "active" gets no badge — it is the default, and a badge on every row is visual
// noise that hides the three statuses that actually matter.
//
// These hold the message-function REFERENCE and invoke it at render time; calling
// m.*() here would freeze the string in whichever locale was active at import.
const BADGE: Record<
  Exclude<SubscriptionStatus, "active">,
  { label: () => string; color: string }
> = {
  paused: { label: m.subs_status_paused, color: colors.accent },
  cancelling: { label: m.subs_status_cancelling, color: colors.muted },
  cancelled: { label: m.subs_status_cancelled, color: colors.muted },
};

export function SubscriptionRow({
  item,
  onPress,
}: {
  item: SubscriptionDto;
  onPress: () => void;
}) {
  const badge = item.status === "active" ? null : BADGE[item.status];
  // Paused rows answer "when does this start costing again", not "when is the
  // next payment" — the resume date is the number the user is looking for.
  const date =
    item.status === "paused" && item.resumeAt
      ? item.resumeAt
      : item.nextPaymentDate;
  const amount = formatConverted(
    item.billing.preferred.amount,
    item.billing.preferred.currencyCode,
    item.cost,
    item.currency,
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${amount}`}
      onPress={onPress}
      style={styles.row}
    >
      <BrandLogo name={item.name} brandDomain={item.brandDomain} size={44} />
      <View style={styles.middle}>
        <View style={styles.titleLine}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          {badge ? (
            <Text
              style={[
                styles.badge,
                { color: badge.color, borderColor: badge.color },
              ]}
              maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
            >
              {badge.label()}
            </Text>
          ) : null}
        </View>
        <Text style={styles.sub} numberOfLines={1}>
          {formatDaysUntil(daysUntil(date), date)}
        </Text>
      </View>
      <Text
        style={styles.amount}
        numberOfLines={1}
        maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
      >
        {amount}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 13,
  },
  middle: { flex: 1, minWidth: 0 },
  titleLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flexShrink: 1, fontSize: 15, fontWeight: "600", color: colors.text },
  badge: {
    fontSize: 10.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  sub: { marginTop: 3, fontSize: 12.5, color: colors.muted },
  amount: { fontSize: 14, fontWeight: "700", color: colors.text },
});
