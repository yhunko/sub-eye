import { useQuery } from "@tanstack/react-query";
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
import { deriveAttention, subscriptionsQuery } from "@/entities/subscription";
import { m } from "@/shared/i18n";
import { colors } from "@/shared/ui/theme";
import { CategoryBars } from "./category-bars";
import { HomeEmpty } from "./home-empty";
import { MonthHero } from "./month-hero";
import { UpcomingRail } from "./upcoming-rail";

// One question per card, in the order a user asks them: what is left this month,
// what needs me, where does it go. The rail is capped at five events, not a
// window onto everything — the Subscriptions tab stays the full list.
export function HomePage() {
  const { data, isPending, isError, refetch } = useDashboard();
  const isPro = usePro();
  // The list the Subscriptions tab already fetches and MMKV already persists.
  // Every attention event is derived from fields it carries, so a server
  // endpoint for them would be a second source of the same truth.
  const subscriptions = useQuery(subscriptionsQuery());

  const events = useMemo(
    () => deriveAttention(subscriptions.data ?? []),
    [subscriptions.data],
  );

  if (isPending || subscriptions.isPending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{m.home_loadError()}</Text>
        <Pressable style={styles.retry} onPress={() => void refetch()}>
          <Text style={styles.retryText}>{m.common_retry()}</Text>
        </Pressable>
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

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
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

      {isPro ? (
        <CategoryBars
          currency={data.preferredCurrencyCode}
          categories={data.categorySpending}
        />
      ) : (
        <ProLock
          title={m.paywall_lockBreakdown()}
          body={m.paywall_lockBreakdownBody()}
        />
      )}
    </ScrollView>
  );
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
  retry: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: { color: colors.accent, fontSize: 15, fontWeight: "600" },
});
