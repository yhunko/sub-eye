import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useDashboard } from "@/entities/dashboard";
import { m } from "@/shared/i18n";
import { colors } from "@/shared/ui/theme";
import { CategoryBars } from "./category-bars";
import { MonthHero } from "./month-hero";
import { ResumingRow } from "./resuming-row";
import { TopSubscription } from "./top-subscription";
import { TrendCard } from "./trend-card";

// One question per card, in the order a user asks them: what is left this month,
// where is it heading, what costs the most, where does it go. Upcoming renewals
// live on the Subscriptions tab — repeating them here made Home a second list.
export function HomePage() {
  const { data, isPending, isError, refetch } = useDashboard();

  if (isPending) {
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

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <MonthHero
        currency={data.preferredCurrencyCode}
        remainingThisMonth={data.remainingThisMonth}
        nextMonthForecast={data.nextMonthForecast}
      />

      <TrendCard
        currency={data.preferredCurrencyCode}
        monthlyTrend={data.monthlyTrend}
      />

      {data.mostExpensiveSubscription ? (
        <TopSubscription
          currency={data.preferredCurrencyCode}
          item={data.mostExpensiveSubscription}
        />
      ) : null}

      <CategoryBars
        currency={data.preferredCurrencyCode}
        categories={data.categorySpending}
      />

      {/* Rendered only when something is actually resuming — an always-present
          empty "Resuming soon" block trains the user to stop reading it. */}
      {data.resumingSoon.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{m.home_resumingSoon()}</Text>
          {data.resumingSoon.map((item) => (
            <ResumingRow key={item.id} item={item} />
          ))}
        </View>
      ) : null}
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
  section: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 12.5,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
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
