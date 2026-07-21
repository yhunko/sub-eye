import type { SubscriptionStatus } from "@subeye/shared";
import { useQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { toTimelineRows, useSubscriptionDetail } from "@/entities/subscription";
import { preferencesQuery } from "@/entities/user";
import { m } from "@/shared/i18n";
import {
  daysUntil,
  formatConverted,
  formatDaysUntil,
} from "@/shared/lib/format";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { nativeHeaderChrome } from "@/shared/ui/header";
import { colors, LAYOUT_FONT_SCALE_MAX } from "@/shared/ui/theme";
import { useLifecycleActions } from "../model/use-lifecycle-actions";
import { TimelineRow } from "./timeline-row";

// References, not calls — see the note in subscriptions-page/ui/subscription-row.
const STATUS_LABEL: Record<SubscriptionStatus, () => string> = {
  active: m.subs_status_active,
  paused: m.subs_status_paused,
  cancelling: m.subs_status_cancelling,
  cancelled: m.subs_status_cancelled,
};

export function SubscriptionDetailPage({ id }: { id: string }) {
  const { data: subscription, isPending, isError } = useSubscriptionDetail(id);
  const { data: preferences } = useQuery(preferencesQuery());
  const locale = preferences?.locale ?? "en-GB";

  const rows = useMemo(
    () => toTimelineRows(subscription?.pricePhases ?? [], locale),
    [subscription?.pricePhases, locale],
  );

  // Called unconditionally, before any early return — the mutations behind it
  // are hooks. It tolerates the empty list while the detail is still loading.
  const { primary, overflow, showOverflow } = useLifecycleActions({
    id,
    name: subscription?.name ?? "",
    allowedActions: subscription?.allowedActions ?? [],
  });

  if (!subscription) {
    return (
      <View style={styles.center}>
        {isPending ? (
          <ActivityIndicator color={colors.muted} />
        ) : (
          <Text style={styles.placeholder}>
            {isError ? m.common_loadFailed() : ""}
          </Text>
        )}
      </View>
    );
  }

  // The same disclosure the list makes: the home-currency total, plus what is
  // actually charged when the two differ.
  const price = formatConverted(
    subscription.billing.preferred.amount,
    subscription.billing.preferred.currencyCode,
    subscription.cost,
    subscription.currency,
  );
  // A paused subscription answers "when does this start costing again".
  const date =
    subscription.status === "paused" && subscription.resumeAt
      ? subscription.resumeAt
      : subscription.nextPaymentDate;

  return (
    <>
      <Stack.Screen
        options={{
          ...nativeHeaderChrome,
          title: subscription.name,
          headerRight: overflow.length
            ? () => (
                <Pressable
                  onPress={showOverflow}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={m.detail_moreActions()}
                >
                  <Text style={styles.headerButton}>
                    {m.detail_moreActions()}
                  </Text>
                </Pressable>
              )
            : undefined,
        }}
      />
      <ScrollView
        style={styles.screen}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        <View style={styles.hero}>
          <BrandLogo
            name={subscription.name}
            brandDomain={subscription.brandDomain}
            size={56}
          />
          <View style={styles.heroText}>
            <Text style={styles.label}>{m.detail_currentPrice()}</Text>
            <Text
              style={styles.price}
              maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
            >
              {price}
            </Text>
          </View>
        </View>

        <Text style={styles.sub}>
          {`${m.detail_nextPayment()}: ${formatDaysUntil(daysUntil(date), date)} · ${STATUS_LABEL[subscription.status]()}`}
        </Text>

        {primary ? (
          <Pressable
            style={styles.primary}
            onPress={primary.run}
            accessibilityRole="button"
          >
            <Text style={styles.primaryLabel}>{primary.label}</Text>
          </Pressable>
        ) : null}

        {rows.length ? (
          <>
            <Text style={styles.sectionTitle}>{m.detail_timeline()}</Text>
            {rows.map((row) => (
              <TimelineRow key={row.id} row={row} />
            ))}
          </>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 24 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  placeholder: { fontSize: 14, color: colors.muted, textAlign: "center" },
  hero: { flexDirection: "row", alignItems: "center", gap: 14 },
  heroText: { flex: 1, minWidth: 0 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.muted,
  },
  price: {
    marginTop: 2,
    fontSize: 30,
    fontWeight: "700",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  sub: { marginTop: 12, fontSize: 13, color: colors.muted },
  primary: {
    marginTop: 20,
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 13,
  },
  primaryLabel: { fontSize: 15, fontWeight: "700", color: colors.bg },
  sectionTitle: {
    marginTop: 28,
    marginBottom: 2,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.muted,
  },
  headerButton: { fontSize: 16, color: colors.accent },
});
