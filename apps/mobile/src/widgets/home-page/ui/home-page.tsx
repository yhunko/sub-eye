import { isCurrentlyActiveSubscription } from "@subeye/lifecycle";
import type { SubscriptionDto } from "@subeye/model";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useDashboard } from "@/entities/dashboard";
import { usePro } from "@/entities/pro";
import { deriveAttention, subscriptionsQuery } from "@/entities/subscription";
import { m } from "@/shared/i18n";
import { categoryColors, colors } from "@/shared/ui/theme";
import { HomeEmpty } from "./home-empty";
import { HomePrompts } from "./home-prompts";
import { MonthHero } from "./month-hero";
import { SpendBars, type SpendRow } from "./spend-bars";
import { UpcomingRail } from "./upcoming-rail";

// One question per card, in the order a user asks them: what is left this month,
// what needs me, where does it go. The rail is capped at five events, not a
// window onto everything — the Subscriptions tab stays the full list.
//
// The third card is answered for EVERYONE. It used to be a `ProLock` for a free
// install, which made the app's most-repeated paywall impression an
// advertisement for a chart that is empty by construction: categories are
// themselves Pro, so behind that lock sat a single 100% "uncategorised" bar.
// A lock over nothing is worse than no lock — it promises something and then
// breaks the promise to whoever pays. Free groups by subscription, which is the
// resolution that install actually has; Pro groups by category. Same question,
// same card, answered as well as the data allows.
const TOP_SUBSCRIPTIONS = 5;

export function HomePage() {
  const { data, isError } = useDashboard();
  const isPro = usePro();
  // The same list the Subscriptions tab reads. Every attention event is derived
  // from fields it carries, so a second projection for them would be a second
  // source of the same truth.
  const subscriptions = useQuery(subscriptionsQuery());

  const events = useMemo(
    () => deriveAttention(subscriptions.data ?? []),
    [subscriptions.data],
  );

  // Gated on there being nothing to paint, never on `isError` alone: a failed
  // re-read must not take the numbers away again.
  if (!data || subscriptions.isPending) {
    if (!isError) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      );
    }

    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{m.home_loadError()}</Text>
      </View>
    );
  }

  // Paused counts as something to come back to, and it is not in
  // `activeSubscriptionsTotal` — without this clause a user who paused
  // everything lands on the first-run screen.
  const paused = (subscriptions.data ?? []).some(
    (subscription) => subscription.status === "paused",
  );
  if (data.activeSubscriptionsTotal === 0 && !paused) {
    return <HomeEmpty />;
  }

  const rows = isPro
    ? data.categorySpending.map((item, index) => ({
        key: item.categoryId ?? "uncategorized",
        name: item.name || m.home_uncategorized(),
        amount: item.amount,
        color: categoryColors[index % categoryColors.length] ?? colors.accent,
      }))
    : topSubscriptionRows(subscriptions.data ?? []);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      {/* Inside this branch and no higher: reaching it at all is the proof that
          the app is working for this user, which is the only state in which
          interrupting them is fair. */}
      <HomePrompts subscriptions={subscriptions.data ?? []} />

      <MonthHero
        currency={data.preferredCurrencyCode}
        remainingThisMonth={data.remainingThisMonth}
        monthTotal={data.totalUpcomingMonth}
        nextMonthForecast={data.nextMonthForecast}
        yearForecast={data.yearlyForecast}
      />

      {/* Most days this is empty, and that is the answer. Rendering an empty
          "nothing needs you" block is what trains a user to stop reading it. */}
      {events.length ? <UpcomingRail events={events} /> : null}

      {rows.length ? (
        <SpendBars currency={data.preferredCurrencyCode} rows={rows} />
      ) : null}
    </ScrollView>
  );
}

/**
 * The biggest subscriptions, with everything else folded into one row.
 *
 * The tail is summed rather than dropped: the bars are read as shares, and
 * shares of a top-five subtotal quietly overstate every one of them. `monthly`
 * is the normalised figure the list's own sort and section totals already use,
 * so a yearly subscription is comparable to a monthly one here.
 */
function topSubscriptionRows(
  subscriptions: readonly SubscriptionDto[],
): SpendRow[] {
  const active = subscriptions
    .filter((item) => isCurrentlyActiveSubscription(item.status))
    .sort((a, b) => b.billing.preferred.monthly - a.billing.preferred.monthly);

  const rows: SpendRow[] = active
    .slice(0, TOP_SUBSCRIPTIONS)
    .map((item, index) => ({
      key: item.id,
      name: item.name,
      amount: item.billing.preferred.monthly,
      color: categoryColors[index % categoryColors.length] ?? colors.accent,
    }));

  const rest = active
    .slice(TOP_SUBSCRIPTIONS)
    .reduce((sum, item) => sum + item.billing.preferred.monthly, 0);

  if (rest > 0) {
    rows.push({
      key: "rest",
      name: m.home_otherSubscriptions(),
      amount: rest,
      color: colors.muted,
    });
  }

  return rows;
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24, gap: 14 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  error: { color: colors.muted, fontSize: 15, textAlign: "center" },
});
