import type { SubscriptionDto } from "@subeye/shared";
import { isCurrentlyActiveSubscription } from "@subeye/shared";

import { Stack } from "expo-router";
import type { AndroidSymbol, SFSymbol } from "expo-symbols";
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
import { ProLock, usePro } from "@/entities/pro";
import { toTimelineRows, useSubscriptionDetail } from "@/entities/subscription";

import { dateLocale, m } from "@/shared/i18n";
import {
  daysUntil,
  formatCountdown,
  formatDate,
  formatMoney,
  formatRemaining,
  formatShortDate,
} from "@/shared/lib/format";
import { nativeHeaderChrome } from "@/shared/ui/header";
import { colors, LAYOUT_FONT_SCALE_MAX } from "@/shared/ui/theme";
import { chargeBeforeCancellation } from "../model/cancellation";
import { cycleProgress } from "../model/cycle";
import { useLifecycleActions } from "../model/use-lifecycle-actions";
import { DetailHero } from "./detail-hero";
import { EndedEmpty } from "./ended-empty";
import { TimelineRow } from "./timeline-row";

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

// Platform symbols per lifecycle action. Keys come from the action builder;
// anything unmapped simply shows as a text-only menu row. One table rather than
// two because the primary button needs the same glyphs the menu does — and the
// primary is no longer always `edit`.
const EDIT_ICON: { ios: SFSymbol; android: AndroidSymbol } = {
  ios: "pencil",
  android: "edit",
};
const ACTION_ICON: Record<string, { ios: SFSymbol; android: AndroidSymbol }> = {
  edit: EDIT_ICON,
  pricing: { ios: "tag", android: "sell" },
  pause: { ios: "pause.circle", android: "pause_circle" },
  resume: { ios: "play.circle", android: "play_circle" },
  cancel: { ios: "xmark.circle", android: "cancel" },
  renew: { ios: "arrow.clockwise", android: "refresh" },
  delete: { ios: "trash", android: "delete" },
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
  const isPro = usePro();
  // Warm from the Home tab in the common case; the share card simply does not
  // render until it lands on a cold deep link.
  const { data: dashboard } = useDashboard();

  // The app's locale, NOT the account's `preferences.locale`: language here is
  // OS-owned (per-app language) and this client never writes that field, so
  // reading it printed English months under a Ukrainian UI.
  const locale = dateLocale();
  const rows = useMemo(
    () => toTimelineRows(subscription?.pricePhases ?? [], locale),
    [subscription?.pricePhases, locale],
  );

  // Called unconditionally, before any early return — the mutations behind it
  // are hooks. It tolerates the empty list while the detail is still loading.
  const { primary, overflow, showOverflow, pageAction } = useLifecycleActions({
    id,
    name: subscription?.name ?? "",
    status: subscription?.status ?? "active",
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

  // One card, one question, and the question changes with the status. A paused
  // subscription asks "when does this start costing again"; a cancelled one has
  // no next date at all, and neither has an indefinite pause.
  //
  // A CANCELLING one asks "when do I lose it", never "when do I pay next". The
  // occurrence exactly on `willBeCancelledAt` is excluded from spend
  // (`shouldIncludeOccurrence` is a strict `<`), and an end-of-period cancel
  // sets that date TO the next payment date — so the card was counting down to
  // a charge the user had already stopped, on the one screen they open to check
  // that they had stopped it.
  const paused = status === "paused";
  const endsAt =
    status === "cancelling" ? subscription.willBeCancelledAt : null;
  const date = paused
    ? subscription.resumeAt
    : (endsAt ?? subscription.nextPaymentDate);
  const showDate = status !== "cancelled" && date !== null;

  const nextCharge = endsAt ? chargeBeforeCancellation(subscription) : null;

  // When a finished subscription stopped. `willBeCancelledAt` is non-null by
  // construction on this status (deriveSubscriptionStatus needs it to reach
  // "cancelled"); the guard is here because the DTO type does not know that.
  const endedAt =
    status === "cancelled" ? subscription.willBeCancelledAt : null;

  // The banner answers "when", already worded for the status; the card below it
  // answers "how long" and owns the countdown. Splitting them this way is what
  // keeps the same date off the screen twice.
  const dateLine = endedAt
    ? m.detail_heroEnded({ date: formatDate(endedAt) })
    : !showDate || date === null
      ? null
      : paused
        ? m.detail_heroResumes({ date: formatDate(date) })
        : endsAt
          ? m.detail_heroEnds({ date: formatDate(date) })
          : m.detail_heroRenews({ date: formatDate(date) });

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
            icon: {
              type: "sfSymbol" as const,
              name: (ACTION_ICON[primary.key] ?? EDIT_ICON).ios,
            },
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
              items: overflow.map((item) => {
                const icon = ACTION_ICON[item.key];
                return {
                  type: "action" as const,
                  label: item.label,
                  destructive: item.destructive,
                  icon: icon && { type: "sfSymbol" as const, name: icon.ios },
                  onPress: item.run,
                };
              }),
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
                  name={ACTION_ICON[primary.key] ?? EDIT_ICON}
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
        <DetailHero
          name={subscription.name}
          brandDomain={subscription.brandDomain}
          status={status}
          cadence={cadence}
          price={price}
          charged={charged}
          dateLine={dateLine}
        />

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
                  date: formatDate(scheduledPriceChange.effectiveAt),
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

        {/* A finished subscription gets no card of FACTS — there are none the
            banner does not already carry. What it gets is the one thing left to
            do with it, which the hook has already taken out of the nav bar. */}
        {pageAction ? <EndedEmpty onRenew={pageAction.run} /> : null}

        {showDate ? (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Text
                style={styles.label}
                maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
              >
                {paused
                  ? m.detail_resumes()
                  : endsAt
                    ? m.detail_ends()
                    : m.detail_nextPayment()}
              </Text>
            </View>
            <Text
              style={styles.countdown}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
            >
              {endsAt
                ? formatRemaining(daysUntil(date))
                : formatCountdown(daysUntil(date))}
            </Text>
            {/* A cycle bar only means anything while the cycle is running. It
                is re-anchored to the cancellation date so the bar fills toward
                what the card is actually counting down to. */}
            {billingNow ? (
              <Track
                value={cycleProgress(
                  endsAt
                    ? { ...subscription, nextPaymentDate: endsAt }
                    : subscription,
                )}
              />
            ) : null}
            {/* The whole reason a user opens a cancelling subscription. */}
            {endsAt ? (
              <Text style={styles.footnote} numberOfLines={1}>
                {nextCharge
                  ? m.detail_endsNextCharge({
                      date: formatShortDate(nextCharge),
                    })
                  : m.detail_endsNoCharges()}
              </Text>
            ) : null}
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

        {/* Nothing to lock when there are no phases: a lock over an empty
            timeline advertises the feature by implying missing data. */}
        {!rows.length ? null : !isPro ? (
          <ProLock
            title={m.paywall_lockTimeline()}
            body={m.paywall_lockTimelineBody()}
          />
        ) : (
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
        )}
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
