import type { SubscriptionDto } from "@subeye/shared";
import { useQuery } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  applySubscriptionFilters,
  DEFAULT_SUBSCRIPTION_FILTERS,
  subscriptionsQuery,
} from "@/entities/subscription";
import { m } from "@/shared/i18n";
import { colors } from "@/shared/ui/theme";
import { FilterChips } from "./filter-chips";
import { SubscriptionRow } from "./subscription-row";

export function SubscriptionsPage() {
  const router = useRouter();
  const list = useQuery(subscriptionsQuery());
  const [filters, setFilters] = useState(DEFAULT_SUBSCRIPTION_FILTERS);

  // Everything the chips and the search field do happens right here, over the
  // array the query already holds. No debounce, no new query key, no round-trip —
  // the search field is instant because it never touches the network.
  const visible = useMemo(
    () => applySubscriptionFilters(list.data ?? [], filters),
    [list.data, filters],
  );

  const hasAny = (list.data?.length ?? 0) > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: m.subscriptions_title(),
          // Native search field in the nav bar. onChangeText writes straight to
          // local state — no debounce is needed when nothing fetches.
          headerSearchBarOptions: {
            placeholder: m.subs_searchPlaceholder(),
            autoCapitalize: "none",
            tintColor: colors.accent,
            textColor: colors.text,
            onChangeText: (event) =>
              setFilters((current) => ({
                ...current,
                search: event.nativeEvent.text,
              })),
          },
        }}
      />
      <FlatList<SubscriptionDto>
        data={visible}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        contentContainerStyle={visible.length ? styles.list : styles.empty}
        refreshControl={
          <RefreshControl
            refreshing={list.isRefetching}
            onRefresh={() => void list.refetch()}
            tintColor={colors.muted}
          />
        }
        ListHeaderComponent={
          hasAny ? (
            <View>
              <FilterChips
                status={filters.status}
                sort={filters.sort}
                onStatus={(status) =>
                  setFilters((current) => ({ ...current, status }))
                }
                onSort={(sort) =>
                  setFilters((current) => ({ ...current, sort }))
                }
              />
              <Text style={styles.count}>
                {m.subs_count({ count: visible.length })}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          list.isLoading ? (
            <ActivityIndicator color={colors.muted} />
          ) : list.isError ? (
            <Text style={styles.placeholder}>{m.common_loadFailed()}</Text>
          ) : (
            <Text style={styles.placeholder}>
              {hasAny ? m.subs_emptyFiltered() : m.subs_empty()}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <SubscriptionRow
            item={item}
            // No setQueryData here: the detail screen reads the row straight out
            // of the list cache via useCachedSubscriptionRow(id), so navigation
            // paints instantly without writing a half-shaped detail object.
            onPress={() =>
              router.push({
                pathname: "/subscriptions/[id]",
                params: { id: item.id },
              })
            }
          />
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    gap: 10,
    paddingBottom: 24,
  },
  empty: {
    flexGrow: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  count: {
    paddingBottom: 6,
    fontSize: 12,
    color: colors.muted,
  },
  placeholder: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
  },
});
