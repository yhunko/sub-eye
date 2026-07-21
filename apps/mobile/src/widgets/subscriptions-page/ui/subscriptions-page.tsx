import type { SubscriptionDto } from "@subeye/shared";
import { useQuery } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { SearchBarCommands } from "react-native-screens";
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
  const searchRef = useRef<SearchBarCommands | null>(null);

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
          headerRight: () => (
            <Pressable
              onPress={() => router.push("/subscriptions/new")}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={m.subs_add()}
            >
              <Text style={styles.add}>+</Text>
            </Pressable>
          ),
          // iOS 26: a collapsed search button on the nav bar's trailing edge that
          // expands into a field on tap ("integratedButton"). Styling stays
          // minimal so the native liquid-glass button owns its own appearance —
          // a custom barTintColor is what renders the glyph black on the dark
          // field. onChangeText writes straight to local state; no debounce is
          // needed because nothing fetches.
          headerSearchBarOptions: {
            ref: searchRef,
            placement: "integratedButton",
            // Keep the button in the nav bar rather than letting iOS pull it
            // into a bottom toolbar on iPhone.
            allowToolbarIntegration: false,
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
        onScrollBeginDrag={() => {
          // integratedButton ignores hideWhenScrolling (UIKit honours that only
          // for the stacked placement), so collapse an empty search back to its
          // button ourselves once the list starts moving.
          if (!filters.search.trim()) searchRef.current?.cancelSearch();
        }}
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
            // No setQueryData here: subscriptionDetailQuery seeds itself from
            // this list cache, so navigation paints instantly without writing a
            // half-shaped detail object on the way out.
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
  // A glyph, not an icon dependency: the header has no icon set wired up and a
  // "+" is the one affordance that needs no legend.
  add: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "300",
    color: colors.accent,
  },
});
