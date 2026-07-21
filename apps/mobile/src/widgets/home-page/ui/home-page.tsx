import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useDashboard } from "@/entities/dashboard";
import { m } from "@/shared/i18n";
import { colors } from "@/shared/ui/theme";
import { RenewalRow } from "./renewal-row";
import { ResumingRow } from "./resuming-row";
import { StatTrio } from "./stat-trio";

// Three server-computed numbers, then what is coming. No charts — that is a
// product decision, not an omission: the v3 web client spent 2,526 LOC on charts
// nobody used, and every number here is already calculated server-side.
export function HomePage() {
  const { data, isPending, isError, isRefetching, refetch } = useDashboard();

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
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          tintColor={colors.muted}
        />
      }
    >
      <StatTrio
        currency={data.preferredCurrencyCode}
        yearlyForecast={data.yearlyForecast}
        monthlyBurnRate={data.monthlyBurnRate}
        remainingThisMonth={data.remainingThisMonth}
        labels={{
          yearly: m.home_yearlyForecast(),
          monthly: m.home_monthlyBurnRate(),
          remaining: m.home_remainingThisMonth(),
        }}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{m.home_nextUp()}</Text>
        {data.upcomingRenewals.length ? (
          data.upcomingRenewals.map((item) => (
            <RenewalRow
              key={`${item.id}-${item.nextPaymentDate}`}
              item={item}
            />
          ))
        ) : (
          <Text style={styles.empty}>{m.home_nextUpEmpty()}</Text>
        )}
      </View>

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
  content: { padding: 16, paddingBottom: 24, gap: 16 },
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
  empty: {
    paddingVertical: 10,
    fontSize: 14,
    color: colors.muted,
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
