import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { memo, useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { dateLocale, m } from "@/shared/i18n";
import {
  COUNTDOWN_DAYS,
  daysUntil,
  formatCountdown,
  formatMoney,
  formatShortDate,
} from "@/shared/lib/format";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { colors } from "@/shared/ui/theme";
import { useLargeText } from "@/shared/ui/use-large-text";
import type { Decision, DecisionKind } from "../model/decisions";

const LOGO = 36;

// Red is reserved for the one event that turns something FREE into something
// charged — the only case where the price arriving was never agreed to. The rest
// are prices the user has already seen; amber is "not yet, but close", which is
// what they are.
const TINT: Record<DecisionKind, string> = {
  trialEnds: colors.danger,
  introEnds: colors.warning,
  priceChange: colors.warning,
  resumes: colors.warning,
};

const LINE: Record<DecisionKind, (inputs: { when: string }) => string> = {
  trialEnds: m.home_decisionTrial,
  introEnds: m.home_decisionIntro,
  priceChange: m.home_decisionPrice,
  resumes: m.home_decisionResumes,
};

const DecisionRow = memo(function DecisionRow({
  event,
  ruled,
  stacked,
  onOpen,
}: {
  event: Decision;
  ruled: boolean;
  stacked: boolean;
  onOpen: (id: string) => void;
}) {
  // `formatDaysUntil`'s own branch, split open because only half of it may be
  // lowercased: the countdown lands mid-sentence here ("Price changes tomorrow"),
  // while the date past a fortnight is a proper noun and "21 sep" is a typo.
  const days = daysUntil(event.date);
  const when =
    days < COUNTDOWN_DAYS
      ? formatCountdown(days).toLocaleLowerCase(dateLocale())
      : formatShortDate(event.date);
  const line = LINE[event.kind]({ when });
  const amount = formatMoney(event.amount, event.currencyCode);
  const previous =
    event.previousAmount === null
      ? null
      : formatMoney(event.previousAmount, event.currencyCode);

  const figures = (
    <View style={[styles.figures, stacked && styles.figuresStacked]}>
      <Text style={styles.amount} numberOfLines={1}>
        {amount}
      </Text>
      {previous ? (
        <Text style={styles.previous} numberOfLines={1}>
          {previous}
        </Text>
      ) : (
        <Text style={styles.caption} numberOfLines={1}>
          {m.home_decisionStarts()}
        </Text>
      )}
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      // Four fragments on screen are one sentence in speech. The struck price is
      // spelled out as what it replaces — a screen reader has no strikethrough.
      accessibilityLabel={[
        event.name,
        line,
        previous
          ? m.home_decisionWasSpoken({ amount, previous })
          : `${amount}, ${m.home_decisionStarts()}`,
      ].join(", ")}
      onPress={() => onOpen(event.subscriptionId)}
      style={({ pressed }) => [
        styles.row,
        // Centred, the logo floats halfway down a row whose text has wrapped to
        // three lines. It belongs beside the name it labels.
        stacked && styles.rowStacked,
        ruled && styles.ruled,
        pressed && styles.pressed,
      ]}
    >
      <BrandLogo
        name={event.name}
        brandDomain={event.brandDomain}
        size={LOGO}
      />
      <View style={styles.middle}>
        <Text style={styles.name} numberOfLines={stacked ? undefined : 1}>
          {event.name}
        </Text>
        <Text
          style={[styles.line, { color: TINT[event.kind] }]}
          numberOfLines={stacked ? undefined : 1}
        >
          {line}
        </Text>
        {stacked ? figures : null}
      </View>
      {stacked ? null : figures}
    </Pressable>
  );
});

/**
 * The events where opening the app still changes the outcome, above everything
 * else on the screen and absent whenever there are none.
 *
 * It sits between the strip and the month card on purpose: the strip says when
 * money leaves on the terms already agreed, and this says where those terms are
 * about to change. A user who has nothing to decide never sees it, which is what
 * keeps it worth reading on the days they do.
 */
export function DecisionList({
  events,
  hidden,
}: {
  events: Decision[];
  hidden: number;
}) {
  const router = useRouter();
  const stacked = useLargeText();

  const openSubscription = useCallback(
    (id: string) =>
      router.push({ pathname: "/subscriptions/[id]", params: { id } }),
    [router],
  );

  // The calendar draws all six dated kinds, month by month, so it is the surface
  // that can actually show the rest. `navigate` rather than `push`: this is a
  // tab, and pushing its route stacks a second copy of it under the Home tab.
  const openCalendar = useCallback(
    () => router.navigate("/calendar"),
    [router],
  );

  if (!events.length) return null;

  return (
    <View>
      <View style={styles.head}>
        <Text style={styles.title}>{m.home_decisions()}</Text>
        <Text style={styles.badge}>{events.length + hidden}</Text>
      </View>

      <View style={styles.card}>
        {events.map((event, index) => (
          <DecisionRow
            key={event.key}
            event={event}
            ruled={hidden > 0 || index < events.length - 1}
            stacked={stacked}
            onOpen={openSubscription}
          />
        ))}

        {/* Never a silent cut. A card that hides events on the screen whose
            promise is "nothing surprises you" has to say so and say where. */}
        {hidden > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={openCalendar}
            style={({ pressed }) => [styles.more, pressed && styles.pressed]}
          >
            <Text style={styles.moreText}>
              {m.home_decisionMore({ count: hidden })}
            </Text>
            <SymbolView
              name={{ ios: "chevron.right", android: "chevron_right" }}
              size={13}
              tintColor={colors.muted}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 8,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  // `lineHeight` on both is NOT styling — see `month-hero`'s `label`. Unset, iOS
  // under-measures a 12.5pt frame at the accessibility text sizes and clips the
  // top of the line.
  title: {
    flexShrink: 1,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  badge: {
    minWidth: 20,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    color: colors.danger,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  rowStacked: { alignItems: "flex-start" },
  ruled: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: { opacity: 0.6 },
  middle: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  line: { marginTop: 2, fontSize: 12.5, fontWeight: "600" },
  figures: { alignItems: "flex-end", flexShrink: 0 },
  // Indented past the logo once it drops below the name, so the row still reads
  // as one thing rather than two.
  figuresStacked: { alignItems: "flex-start", marginTop: 6 },
  amount: { fontSize: 14, fontWeight: "700", color: colors.text },
  // The price this replaces. Struck, muted and smaller — it is context for the
  // figure above it, never a second amount to compare.
  previous: {
    marginTop: 2,
    fontSize: 11,
    color: colors.muted,
    textDecorationLine: "line-through",
  },
  caption: { marginTop: 2, fontSize: 11, color: colors.muted },
  more: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
  },
  moreText: { flex: 1, fontSize: 13.5, color: colors.muted },
});
