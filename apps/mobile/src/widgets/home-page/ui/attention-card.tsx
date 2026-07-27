import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { AttentionEvent, AttentionKind } from "@/entities/subscription";
import { m } from "@/shared/i18n";
import { daysUntil, formatDaysUntil, formatMoney } from "@/shared/lib/format";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { colors, LAYOUT_FONT_SCALE_MAX } from "@/shared/ui/theme";

// Message-function REFERENCES, invoked at render. Calling m.*() at module scope
// freezes the string in whichever locale was active at import.
const LABEL: Record<AttentionKind, (inputs: { when: string }) => string> = {
  trialEnds: m.home_attnTrialEnds,
  introEnds: m.home_attnIntroEnds,
  priceChange: m.home_attnPriceChange,
  payment: m.home_attnPayment,
  resumes: m.home_attnResumes,
  ends: m.home_attnEnds,
};

// A price about to rise is the only thing here that costs MORE by doing nothing,
// so it is the only thing that gets the alarm colour. A renewal at the price you
// already agreed to is just the calendar, and reads muted.
const TINT: Record<AttentionKind, string> = {
  trialEnds: colors.danger,
  introEnds: colors.danger,
  priceChange: colors.danger,
  payment: colors.muted,
  resumes: colors.accent,
  ends: colors.muted,
};

/**
 * What happens next, soonest first — the only thing on Home that differs between
 * two opens on consecutive days. `deriveAttention` caps the list, so this card
 * has the same height whether the account holds four subscriptions or forty; the
 * Subscriptions tab stays the place that lists everything at once.
 *
 * The caller renders nothing when the list is empty. An always-present empty
 * block is what teaches a user to stop reading a card.
 */
export function AttentionCard({ events }: { events: AttentionEvent[] }) {
  const router = useRouter();

  return (
    <View style={styles.card}>
      <Text style={styles.title} maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}>
        {m.home_attention()}
      </Text>
      {events.map((event) => {
        const when = formatDaysUntil(daysUntil(event.date), event.date);
        const detail = LABEL[event.kind]({ when });

        return (
          <Pressable
            key={event.key}
            accessibilityRole="button"
            accessibilityLabel={`${event.name}, ${detail}`}
            onPress={() =>
              router.push({
                pathname: "/subscriptions/[id]",
                params: { id: event.subscriptionId },
              })
            }
            style={styles.row}
          >
            <BrandLogo
              name={event.name}
              brandDomain={event.brandDomain}
              size={36}
            />
            <View style={styles.middle}>
              <Text style={styles.name} numberOfLines={1}>
                {event.name}
              </Text>
              <Text
                style={[styles.detail, { color: TINT[event.kind] }]}
                numberOfLines={1}
              >
                {detail}
              </Text>
            </View>
            <Text
              style={styles.amount}
              numberOfLines={1}
              maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
            >
              {formatMoney(event.amount, event.currencyCode)}
            </Text>
          </Pressable>
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
    paddingVertical: 12,
  },
  title: {
    fontSize: 12.5,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  middle: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  detail: { marginTop: 2, fontSize: 12.5, fontWeight: "600" },
  amount: { fontSize: 14, fontWeight: "700", color: colors.text },
});
