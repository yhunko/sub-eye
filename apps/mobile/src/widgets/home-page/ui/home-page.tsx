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
import { subscriptionsQuery } from "@/entities/subscription";
import { m } from "@/shared/i18n";
import { categoryColors, colors } from "@/shared/ui/theme";
import { buildDecisions } from "../model/decisions";
import { buildRail } from "../model/rail";
import { DecisionList } from "./decision-list";
import { HomeEmpty } from "./home-empty";
import { brandWash, useAndroidHeaderInset } from "./home-glow";
import { HomePrompts } from "./home-prompts";
import { MonthHero } from "./month-hero";
import { MonthRail } from "./month-rail";
import { SpendBreakdown, type SpendRow } from "./spend-breakdown";

// One question per band, in the order a user asks them: WHEN does it leave, WHAT
// still needs deciding, HOW MUCH is left, WHERE does it go. The strip at the top
// is the only thing here that differs between two opens on consecutive days,
// which is why it takes the fold.
//
// The second band is the reason the app is worth opening rather than checking
// once a month: a strip of charges answers a question the user already knows the
// answer to, and "Needs a decision" is the only place the app says something they
// could not have predicted. It is absent whenever there is nothing to decide,
// which is most days — that silence is what keeps it worth reading on the days it
// speaks. Everything below it is a summary of terms already agreed, which is why
// the month card gave up the headline size it used to take: that figure decays to
// zero by the 30th and nothing can be done about it either way.
//
// There used to be a fourth band between the hero and the breakdown — a
// horizontal card rail of the next five dated events, "Coming up". It went
// because the strip answers the same question better: it shows every charge for
// the rest of the month in the space that card spent on five, and a user who
// wants the ones past it has a Calendar tab that is not gated. What the rail
// carried and nothing else does is the WORDING of a non-charge event ("Trial
// ends in 3 days"); those are reminders' job, and the calendar names them on
// the day.
//
// The last card is answered for EVERYONE. It used to be a `ProLock` for a free
// install, which made the app's most-repeated paywall impression an
// advertisement for a chart that is empty by construction: categories are
// themselves Pro, so behind that lock sat a single 100% "uncategorised" bar.
// A lock over nothing is worse than no lock — it promises something and then
// breaks the promise to whoever pays. Free groups by subscription, which is the
// resolution that install actually has; Pro groups by category. Same question,
// same card, answered as well as the data allows.
//
// Nothing on this screen is gated. The strip and the bar under the hero are the
// dashboard's own `cashFlowForecast` drawn twice over, and every figure in them
// was already free; the calendar tab gives the same days away tile by tile. The
// month-over-month delta that IS Pro lives on the calendar and looks BACKWARDS
// — this one looks forward, off a forecast a free install has always been shown.
export function HomePage() {
  const { data, isError } = useDashboard();
  const isPro = usePro();
  // Above the early returns, because a hook has to be. Only the scrolling branch
  // uses it — the loading and error states centre in the whole screen, which is
  // where they should be with the bar transparent over them.
  const headerInset = useAndroidHeaderInset();
  // The same list the Subscriptions tab reads — it is what the breakdown groups
  // for a free install, and what tells this screen whether everything is merely
  // paused.
  const subscriptions = useQuery(subscriptionsQuery());

  // Memoised on the forecast alone, which is what keeps the strip's cells
  // identical objects between repaints — every one of them is `memo`ised, and a
  // fresh array per render would defeat all of it.
  const railDays = useMemo(
    () => buildRail(data?.cashFlowForecast ?? []),
    [data?.cashFlowForecast],
  );

  // Off the list, not off the forecast: a cash-flow point carries payments only,
  // and every event this band exists for is a dated notice with no money moving
  // on its own day.
  const decisions = useMemo(
    () => buildDecisions(subscriptions.data ?? []),
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
    : subscriptionRows(subscriptions.data ?? []);

  return (
    <View style={styles.page}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, headerInset]}
      >
        {/* Inside this branch and no higher: reaching it at all is the proof that
          the app is working for this user, which is the only state in which
          interrupting them is fair. */}
        <HomePrompts tracked={(subscriptions.data ?? []).length} />

        {/* Empty on the last day of the month, and only then. A strip with one
          cell in it is still the answer — "nothing else this month" — but no
          cells at all is a hairline under nothing. */}
        {railDays.length ? (
          <MonthRail days={railDays} currency={data.preferredCurrencyCode} />
        ) : null}

        <DecisionList events={decisions.shown} hidden={decisions.hidden} />

        <MonthHero
          currency={data.preferredCurrencyCode}
          remainingThisMonth={data.remainingThisMonth}
          monthTotal={data.totalUpcomingMonth}
          nextMonthForecast={data.nextMonthForecast}
          biggest={data.mostExpensiveSubscription}
        />

        {rows.length ? (
          <SpendBreakdown
            currency={data.preferredCurrencyCode}
            rows={rows}
            count={isPro ? m.home_countCategories : m.home_countSubscriptions}
            more={isPro ? m.home_moreCategories : m.home_moreSubscriptions}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

/**
 * Every active subscription, biggest first.
 *
 * The tail is no longer summed into an "everything else" row: the card folds it
 * behind a tap of its own, so the shares are computed over the real total either
 * way and the rows the fold hides can actually be looked at. `monthly` is the
 * normalised figure the list's own sort and section totals already use, so a
 * yearly subscription is comparable to a monthly one here.
 */
function subscriptionRows(
  subscriptions: readonly SubscriptionDto[],
): SpendRow[] {
  return subscriptions
    .filter((item) => isCurrentlyActiveSubscription(item.status))
    .sort((a, b) => b.billing.preferred.monthly - a.billing.preferred.monthly)
    .map((item, index) => ({
      key: item.id,
      name: item.name,
      amount: item.billing.preferred.monthly,
      color: categoryColors[index % categoryColors.length] ?? colors.accent,
    }));
}

const styles = StyleSheet.create({
  // `flex: 1` so it fills the screen the navigator hands over, which is what the
  // wash is drawn against. Nothing may be rendered BEFORE the ScrollView inside
  // it — see `brandWash`, which is a background for that reason.
  page: { ...brandWash, flex: 1 },
  content: { padding: 16, paddingBottom: 24, gap: 14 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  error: { color: colors.muted, fontSize: 15, textAlign: "center" },
});
