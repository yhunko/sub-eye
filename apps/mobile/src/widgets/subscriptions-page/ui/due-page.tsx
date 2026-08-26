import type { SubscriptionDto } from "@subeye/model";
import { useQuery } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useCallback, useMemo, useRef } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import {
  subscriptionsDueOn,
  subscriptionsQuery,
  useLifecycleActionBuilder,
} from "@/entities/subscription";
import { m } from "@/shared/i18n";
import { formatMoney, formatShortDate } from "@/shared/lib/format";
import { nativeHeaderChrome } from "@/shared/ui/header";
import { colors } from "@/shared/ui/theme";
import { SubscriptionRow } from "./subscription-row";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * What a digest reminder opens: the subscriptions charging on one day, and what
 * they come to.
 *
 * Lives in this widget rather than its own so it can render `SubscriptionRow`
 * directly — a widget importing another widget's `ui/` is a cross-import that
 * `check:boundaries` rejects, and a second copy of that row is worse than a
 * second page composition in the slice that owns it.
 *
 * A pushed route rather than a filter on the list: `subscriptionFilters` is
 * deliberately not persisted because "a filter is a thing you do for the next
 * thirty seconds", and a notification that silently pinned the list to one date
 * would leave the user staring at what reads as missing data. Back clears this
 * by construction.
 */
export function DuePage({ date }: { date: string }) {
  const router = useRouter();
  const list = useQuery(subscriptionsQuery());
  const buildActions = useLifecycleActionBuilder();

  const openRow = useRef<SwipeableMethods | null>(null);
  const handleSwipeOpen = useCallback((row: SwipeableMethods) => {
    if (openRow.current && openRow.current !== row) openRow.current.close();
    openRow.current = row;
  }, []);

  // The param arrives from a notification payload this app wrote, but it is
  // still input from outside the process — a malformed day shows the empty
  // state rather than rendering "Invalid Date" into the header.
  const valid = ISO_DAY.test(date);

  const items = useMemo(
    () => (valid ? subscriptionsDueOn(list.data ?? [], date) : []),
    [list.data, date, valid],
  );

  // `preferred.amount` is the charge as it will be taken, converted to the home
  // currency — NOT `preferred.monthly`, which the list column uses to compare a
  // yearly plan against a monthly one. This screen answers "what leaves the
  // account that day", so it wants the real figure.
  const total = useMemo(
    () =>
      Number(
        items
          .reduce((sum, item) => sum + item.billing.preferred.amount, 0)
          .toFixed(2),
      ),
    [items],
  );

  const handlePress = useCallback(
    (item: SubscriptionDto) =>
      router.push({ pathname: "/subscriptions/[id]", params: { id: item.id } }),
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: SubscriptionDto }) => (
      <SubscriptionRow
        item={item}
        onPress={handlePress}
        buildActions={buildActions}
        onSwipeOpen={handleSwipeOpen}
      />
    ),
    [handlePress, buildActions, handleSwipeOpen],
  );

  return (
    <>
      <Stack.Screen
        options={{
          ...nativeHeaderChrome,
          title: valid
            ? m.due_title({ date: formatShortDate(`${date}T00:00:00.000Z`) })
            : m.subscriptions_title(),
        }}
      />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          items.length ? (
            <View style={styles.summary}>
              <Text style={styles.summaryLabel}>{m.due_total()}</Text>
              <Text style={styles.summaryAmount}>
                {formatMoney(
                  total,
                  items[0]?.billing.preferred.currencyCode ?? "",
                )}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          list.isPending ? null : (
            <Text style={styles.empty}>{m.due_empty()}</Text>
          )
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24 },
  summary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 12.5,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  summaryAmount: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  empty: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    paddingTop: 32,
  },
});
