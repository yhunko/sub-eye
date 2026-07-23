import type { SubscriptionDto, SubscriptionStatus } from "@subeye/shared";
import { isCurrentlyActiveSubscription } from "@subeye/shared";
import { useQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import type { SFSymbol } from "expo-symbols";
import { SymbolView } from "expo-symbols";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useDashboard } from "@/entities/dashboard";
import { toTimelineRows, useSubscriptionDetail } from "@/entities/subscription";
import { preferencesQuery } from "@/entities/user";
import { m } from "@/shared/i18n";
import {
  daysUntil,
  formatCountdown,
  formatDate,
  formatMoney,
} from "@/shared/lib/format";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { nativeHeaderChrome } from "@/shared/ui/header";
import { colors, LAYOUT_FONT_SCALE_MAX } from "@/shared/ui/theme";
import { cycleProgress } from "../model/cycle";
import { useLifecycleActions } from "../model/use-lifecycle-actions";
import { TimelineRow } from "./timeline-row";

// References, not calls — see the note in subscriptions-page/ui/subscription-row.
const STATUS_LABEL: Record<SubscriptionStatus, () => string> = {
  active: m.subs_status_active,
  paused: m.subs_status_paused,
  cancelling: m.subs_status_cancelling,
  cancelled: m.subs_status_cancelled,
};

// The status dot in the hero. Green only means "billing normally" — the two
// wind-down states share the paused amber, and a dead subscription goes grey.
const STATUS_COLOR: Record<SubscriptionStatus, string> = {
  active: colors.accent,
  paused: colors.warning,
  cancelling: colors.warning,
  cancelled: colors.muted,
};

// "monthly" reads better than "every 1 month", and the plural case is spelled
// per locale rather than pluralised at runtime — Hermes has no Intl.PluralRules.
const CADENCE_ONCE: Record<SubscriptionDto["period"], () => string> = {
  day: m.cadence_day,
  week: m.cadence_week,
  month: m.cadence_month,
  year: m.cadence_year,
};
const CADENCE_EVERY: Record<
  SubscriptionDto["period"],
  (inputs: { every: number }) => string
> = {
  day: m.cadence_everyDays,
  week: m.cadence_everyWeeks,
  month: m.cadence_everyMonths,
  year: m.cadence_everyYears,
};

// SF Symbols for the native overflow menu. Keys come from the lifecycle action
// builder; anything unmapped simply shows as a text-only menu row.
const MENU_ICON: Record<string, { type: "sfSymbol"; name: SFSymbol }> = {
  pricing: { type: "sfSymbol", name: "tag" },
  pause: { type: "sfSymbol", name: "pause.circle" },
  resume: { type: "sfSymbol", name: "play.circle" },
  cancel: { type: "sfSymbol", name: "xmark.circle" },
  renew: { type: "sfSymbol", name: "arrow.clockwise" },
  delete: { type: "sfSymbol", name: "trash" },
};

function Track({ value }: { value: number }) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${Math.round(value * 100)}%` }]} />
    </View>
  );
}

export function SubscriptionDetailPage({ id }: { id: string }) {
  const { data: subscription, isPending, isError } = useSubscriptionDetail(id);
  const { data: preferences } = useQuery(preferencesQuery());
  // Warm from the Home tab in the common case; the share card simply does not
  // render until it lands on a cold deep link.
  const { data: dashboard } = useDashboard();
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

  const { status, billing, scheduledPriceChange } = subscription;
  const preferred = billing.preferred;
  const billingNow = isCurrentlyActiveSubscription(status);

  // The same disclosure the list makes: the home-currency amount is the headline,
  // and what is actually charged only earns a line when the two differ.
  const price = formatMoney(preferred.amount, preferred.currencyCode);
  const charged =
    preferred.currencyCode.trim().toLowerCase() !==
    subscription.currency.trim().toLowerCase()
      ? formatMoney(subscription.cost, subscription.currency)
      : null;

  const cadence =
    subscription.every === 1
      ? CADENCE_ONCE[subscription.period]()
      : CADENCE_EVERY[subscription.period]({ every: subscription.every });

  // A paused subscription answers "when does this start costing again"; a
  // cancelled one has no next date at all, and neither has an indefinite pause.
  const paused = status === "paused";
  const date = paused ? subscription.resumeAt : subscription.nextPaymentDate;
  const showDate = status !== "cancelled" && date !== null;

  // How much of the monthly burn rate this one subscription is. Normalised
  // monthly on both sides, so a yearly subscription compares honestly.
  const burnRate = dashboard?.monthlyBurnRate ?? 0;
  const share =
    billingNow && burnRate > 0
      ? Math.min(1, preferred.monthly / burnRate)
      : null;
  // A free phase is genuinely 0% — only a real but tiny slice rounds to "<1%".
  const sharePercent =
    share === null || share === 0
      ? "0%"
      : share < 0.005
        ? "<1%"
        : `${Math.round(share * 100)}%`;

  // iOS: real UIBarButtonItems in the navigation item's trailing slot — the
  // `prominent` variant is UIKit's own filled (glass, on iOS 26) button, and the
  // ellipsis carries a native UIMenu instead of opening an action sheet, which is
  // what the platform expects from a "more" button in a nav bar.
  const barItems = () => [
    ...(primary
      ? [
          {
            type: "button" as const,
            label: primary.label,
            icon: { type: "sfSymbol" as const, name: "pencil" as const },
            variant: "prominent" as const,
            tintColor: colors.accent,
            onPress: primary.run,
          },
        ]
      : []),
    ...(overflow.length
      ? [
          {
            type: "menu" as const,
            label: m.detail_moreActions(),
            icon: { type: "sfSymbol" as const, name: "ellipsis" as const },
            menu: {
              title: subscription.name,
              items: overflow.map((item) => ({
                type: "action" as const,
                label: item.label,
                destructive: item.destructive,
                icon: MENU_ICON[item.key],
                onPress: item.run,
              })),
            },
          },
        ]
      : []),
  ];

  // Android has no bar button items; it keeps the custom view (expo-router only
  // swaps in the native items on iOS) and the OS action sheet behind it.
  const androidActions =
    primary || overflow.length
      ? () => (
          <View style={styles.headerActions}>
            {primary ? (
              <Pressable
                onPress={primary.run}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={primary.label}
              >
                <SymbolView
                  name={{ ios: "pencil", android: "edit" }}
                  size={22}
                  tintColor={colors.accent}
                  weight="semibold"
                />
              </Pressable>
            ) : null}
            {overflow.length ? (
              <Pressable
                onPress={showOverflow}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={m.detail_moreActions()}
              >
                <SymbolView
                  name={{ ios: "ellipsis", android: "more_vert" }}
                  size={22}
                  tintColor={colors.text}
                  weight="semibold"
                />
              </Pressable>
            ) : null}
          </View>
        )
      : undefined;

  return (
    <>
      <Stack.Screen
        options={{
          ...nativeHeaderChrome,
          title: subscription.name,
          unstable_headerRightItems: barItems,
          headerRight: androidActions,
        }}
      />
      <ScrollView
        style={styles.screen}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        <View style={[styles.card, styles.hero]}>
          <BrandLogo
            name={subscription.name}
            brandDomain={subscription.brandDomain}
            size={56}
          />
          <View style={styles.heroText}>
            <Text style={styles.name} numberOfLines={1}>
              {subscription.name}
            </Text>
            <View style={styles.statusLine}>
              <View
                style={[styles.dot, { backgroundColor: STATUS_COLOR[status] }]}
              />
              <Text
                style={[styles.status, { color: STATUS_COLOR[status] }]}
                numberOfLines={1}
              >
                {STATUS_LABEL[status]()}
              </Text>
              <Text style={styles.cadence} numberOfLines={1}>
                {`· ${cadence}`}
              </Text>
            </View>
          </View>
          <View style={styles.heroPrice}>
            <Text
              style={styles.label}
              numberOfLines={1}
              maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
            >
              {m.detail_currentPrice()}
            </Text>
            <Text
              style={styles.price}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
            >
              {price}
            </Text>
            {charged ? <Text style={styles.charged}>{charged}</Text> : null}
          </View>
        </View>

        {scheduledPriceChange ? (
          <View style={styles.alert}>
            <SymbolView
              name={{
                ios: "exclamationmark.triangle.fill",
                android: "warning",
              }}
              size={18}
              tintColor={colors.warning}
              weight="semibold"
              style={styles.alertIcon}
            />
            <View style={styles.alertText}>
              <Text style={styles.alertTitle}>
                {m.detail_priceChangeTitle()}
              </Text>
              <Text style={styles.alertBody}>
                {m.detail_priceChangeBody({
                  date: formatDate(scheduledPriceChange.effectiveAt, locale),
                  from: price,
                  to: formatMoney(
                    scheduledPriceChange.billing.preferred.amount,
                    scheduledPriceChange.billing.preferred.currencyCode,
                  ),
                })}
              </Text>
            </View>
          </View>
        ) : null}

        {showDate ? (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Text
                style={styles.label}
                maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
              >
                {paused ? m.detail_resumes() : m.detail_nextPayment()}
              </Text>
              <Text style={styles.headValue} numberOfLines={1}>
                {formatDate(date, locale)}
              </Text>
            </View>
            <Text
              style={styles.countdown}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
            >
              {formatCountdown(daysUntil(date))}
            </Text>
            {/* A cycle bar only means anything while the cycle is running. */}
            {billingNow ? <Track value={cycleProgress(subscription)} /> : null}
          </View>
        ) : null}

        {share !== null && dashboard ? (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Text
                style={styles.label}
                maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
              >
                {m.detail_spendShare()}
              </Text>
              <Text style={styles.headValue}>{sharePercent}</Text>
            </View>
            <Track value={share} />
            <Text style={styles.footnote} numberOfLines={1}>
              {m.detail_spendShareOf({
                amount: formatMoney(preferred.monthly, preferred.currencyCode),
                total: formatMoney(
                  dashboard.monthlyBurnRate,
                  dashboard.preferredCurrencyCode,
                  { decimals: 0 },
                ),
              })}
            </Text>
          </View>
        ) : null}

        {rows.length ? (
          <View style={[styles.card, styles.timeline]}>
            <Text
              style={styles.label}
              maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
            >
              {m.detail_timeline()}
            </Text>
            {rows.map((row, index) => (
              <TimelineRow
                key={row.id}
                row={row}
                last={index === rows.length - 1}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 24, gap: 14 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  placeholder: { fontSize: 14, color: colors.muted, textAlign: "center" },

  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 18,
  },
  hero: { flexDirection: "row", alignItems: "center", gap: 14 },
  heroText: { flex: 1, minWidth: 0 },
  name: { fontSize: 19, fontWeight: "700", color: colors.text },
  statusLine: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 999 },
  status: { fontSize: 13, fontWeight: "600" },
  cadence: { fontSize: 13, color: colors.muted, flexShrink: 1 },
  heroPrice: { alignItems: "flex-end", flexShrink: 0 },
  price: {
    marginTop: 3,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  charged: { marginTop: 2, fontSize: 12, color: colors.muted },

  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.muted,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  headValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    flexShrink: 1,
  },
  countdown: {
    marginTop: 10,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: colors.text,
  },
  track: {
    marginTop: 14,
    height: 7,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 999, backgroundColor: colors.accent },
  footnote: { marginTop: 9, fontSize: 12, color: colors.muted },

  alert: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: "rgba(224,163,46,0.35)",
    borderRadius: 20,
    padding: 15,
  },
  alertIcon: { marginTop: 1 },
  alertText: { flex: 1, minWidth: 0 },
  alertTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  alertBody: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },

  timeline: { paddingVertical: 14 },
});
