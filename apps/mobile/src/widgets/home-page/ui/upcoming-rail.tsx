import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import type { AttentionEvent, AttentionKind } from "@/entities/subscription";
import { m } from "@/shared/i18n";
import { daysUntil, formatDaysUntil, formatMoney } from "@/shared/lib/format";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { colors } from "@/shared/ui/theme";

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

// Colour says WHEN, the glyph says WHAT. Two signals on one line only work if
// they answer different questions — colouring by kind as well left "renews
// tomorrow" and "renews in five weeks" identical, which is the one distinction
// a card about the future has to make.
//
// A ROLLING seven days, not the rest of the calendar week: a real week collapses
// to nothing by Saturday, so the same renewal would change colour on a day when
// nothing about it changed.
//
// `ends` sits outside the ramp entirely — see `stopping` below.
function urgencyTint(days: number): string {
  if (days <= 1) return colors.danger;
  if (days <= 7) return colors.warning;
  return colors.muted;
}

// `as const satisfies` rather than an annotation: SymbolView's `name` is a union
// of every symbol name there is, so a `string` here widens out of it and stops
// type-checking the names at all.
const ICON = {
  trialEnds: { ios: "hourglass", android: "hourglass_empty" },
  introEnds: { ios: "tag", android: "sell" },
  priceChange: { ios: "arrow.up.right", android: "trending_up" },
  payment: { ios: "arrow.triangle.2.circlepath", android: "autorenew" },
  resumes: { ios: "play.circle", android: "play_circle" },
  ends: { ios: "xmark.circle", android: "cancel" },
} as const satisfies Record<AttentionKind, unknown>;

/** Home's own horizontal padding, which the rail has to escape. */
const PAGE_PADDING = 16;
/** At the default text size. It scales with Dynamic Type — see `cardWidth`. */
const CARD_WIDTH = 216;
const GAP = 12;

/**
 * What happens next, soonest first — the only thing on Home that differs between
 * two opens on consecutive days.
 *
 * A rail rather than a stacked list: a card carries the logo, the name, the
 * amount and the countdown at a size worth glancing at, and the cut-off card at
 * the right edge is what says "there is more" without spending vertical space
 * saying it. `deriveAttention` caps the list at five, so this never becomes the
 * Subscriptions tab in miniature — that tab stays the place that lists
 * everything at once.
 *
 * The caller renders nothing when the list is empty. An always-present empty
 * block is what teaches a user to stop reading a card.
 */
export function UpcomingRail({ events }: { events: AttentionEvent[] }) {
  const router = useRouter();

  // The card is the one thing here that cannot grow on its own: a snapping rail
  // has to know the width it snaps by. So the width follows the text, up to a
  // card that is the whole screen — past that a wider card would be a card you
  // cannot see the end of.
  const { fontScale, width } = useWindowDimensions();
  const cardWidth = Math.min(
    Math.round(CARD_WIDTH * Math.max(1, fontScale)),
    width - PAGE_PADDING * 2,
  );

  return (
    <View>
      <Text style={styles.title}>{m.home_attention()}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // A card at a time, the way every native carousel settles. snapToOffsets
        // rather than snapToInterval: the leading padding below shifts every card
        // by PAGE_PADDING, which an interval measured from contentOffset 0 does
        // not know about, and every card would rest 16pt off its own edge.
        decelerationRate="fast"
        snapToOffsets={events.map((_, index) => index * (cardWidth + GAP))}
        // The page's vertical scroll view takes UIKit's automatic safe-area
        // inset. Without this the nested horizontal one takes it too and starts
        // the rail pushed in by the status bar's height.
        automaticallyAdjustContentInsets={false}
        style={styles.rail}
        contentContainerStyle={styles.railContent}
      >
        {events.map((event) => {
          const days = daysUntil(event.date);
          const detail = LABEL[event.kind]({
            when: formatDaysUntil(days, event.date),
          });
          const amount = formatMoney(event.amount, event.currencyCode);

          // The only kind that takes money OFF the bill. It opts out of the
          // urgency ramp — a cancellation landing tomorrow is not an alarm, and
          // red said the opposite of what it means — and its amount is struck
          // through, because printed like every other figure here it reads as a
          // charge on the way rather than one that stops.
          const stopping = event.kind === "ends";
          const tint = stopping ? colors.accent : urgencyTint(days);

          return (
            <Pressable
              key={event.key}
              accessibilityRole="button"
              // A strikethrough is invisible to VoiceOver, which would read the
              // amount as a plain charge — the exact misreading the strike is
              // there to prevent. Spell it out instead.
              accessibilityLabel={`${event.name}, ${detail}, ${
                stopping ? m.home_attnStops({ amount }) : amount
              }`}
              onPress={() =>
                router.push({
                  pathname: "/subscriptions/[id]",
                  params: { id: event.subscriptionId },
                })
              }
              style={({ pressed }) => [
                styles.card,
                { width: cardWidth },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.head}>
                <BrandLogo
                  name={event.name}
                  brandDomain={event.brandDomain}
                  size={38}
                />
                <Text style={[styles.amount, stopping && styles.amountStopped]}>
                  {amount}
                </Text>
              </View>
              <Text style={styles.name}>{event.name}</Text>
              <View style={styles.whenRow}>
                <SymbolView
                  name={ICON[event.kind]}
                  size={13}
                  weight="semibold"
                  tintColor={tint}
                />
                <Text style={[styles.detail, { color: tint }]}>{detail}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 12.5,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  rail: { marginHorizontal: -PAGE_PADDING },
  railContent: { paddingHorizontal: PAGE_PADDING, gap: GAP },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  pressed: { opacity: 0.65 },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  amount: {
    flexShrink: 1,
    textAlign: "right",
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  // Muted, not green: the green belongs to the line below, which says why the
  // number is struck. A struck GREEN price is the sale-tag pattern, and this is
  // not a discount.
  amountStopped: {
    color: colors.muted,
    textDecorationLine: "line-through",
  },
  name: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  whenRow: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detail: { flexShrink: 1, fontSize: 12.5, fontWeight: "600" },
});
