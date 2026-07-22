import type { SubscriptionDto } from "@subeye/shared";
import { useQuery } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import type { SearchBarCommands } from "react-native-screens";
import {
  applySubscriptionFilters,
  DEFAULT_SUBSCRIPTION_FILTERS,
  subscriptionsQuery,
  useLifecycleActionBuilder,
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

  // ONE set of lifecycle mutations for the whole screen. Every visible row's
  // swipe actions are built from this — a hook per row would mean five TanStack
  // mutation observers per row.
  const buildActions = useLifecycleActionBuilder();

  // Only one row may be open at a time, the way every native list behaves.
  // A ref, not state: closing a sibling must not re-render the list.
  const openRow = useRef<SwipeableMethods | null>(null);
  const handleSwipeOpen = useCallback((row: SwipeableMethods) => {
    if (openRow.current && openRow.current !== row) openRow.current.close();
    openRow.current = row;
  }, []);
  const closeOpenRow = useCallback(() => {
    openRow.current?.close();
    openRow.current = null;
  }, []);

  // Everything the chips and the search field do happens right here, over the
  // array the query already holds. No debounce, no new query key, no round-trip —
  // the search field is instant because it never touches the network.
  const visible = useMemo(
    () => applySubscriptionFilters(list.data ?? [], filters),
    [list.data, filters],
  );

  const hasAny = (list.data?.length ?? 0) > 0;

  // No setQueryData here: subscriptionDetailQuery seeds itself from this list
  // cache, so navigation paints instantly without writing a half-shaped detail
  // object on the way out. Stable so the memoized rows stay memoized.
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
        // The filter/sort bar pins under the nav bar instead of scrolling away.
        // This is the ScrollView's own sticky-header path — the header stays put
        // on the UI thread, no scroll listener on the JS side. Index 0 is the
        // ListHeaderComponent, so it is only valid while that header exists.
        stickyHeaderIndices={hasAny ? STICKY_HEADER : undefined}
        onScrollBeginDrag={() => {
          closeOpenRow();
          // integratedButton ignores hideWhenScrolling (UIKit honours that only
          // for the stacked placement), so collapse an empty search back to its
          // button ourselves once the list starts moving.
          if (!filters.search.trim()) searchRef.current?.cancelSearch();
        }}
        // ponytail: no getItemLayout. Rows are a fixed ROW_HEIGHT, so
        // VirtualizedList's own length estimate is exact after the first cell —
        // and getItemLayout offsets would have to hard-code this header's height,
        // which Dynamic Type can change under us.
        contentContainerStyle={[styles.list, !visible.length && styles.grow]}
        ListHeaderComponent={
          hasAny ? (
            <View style={styles.header}>
              <FilterChips
                status={filters.status}
                sort={filters.sort}
                onStatus={(status) => {
                  closeOpenRow();
                  setFilters((current) => ({ ...current, status }));
                }}
                onSort={(sort) => {
                  closeOpenRow();
                  setFilters((current) => ({ ...current, sort }));
                }}
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          // Centres itself in whatever space is left BELOW the pinned chips,
          // rather than centring the chips along with it.
          <View style={styles.emptyBox}>
            {list.isLoading ? (
              <ActivityIndicator color={colors.muted} />
            ) : (
              <Text style={styles.placeholder}>
                {list.isError
                  ? m.common_loadFailed()
                  : hasAny
                    ? m.subs_emptyFiltered()
                    : m.subs_empty()}
              </Text>
            )}
          </View>
        }
        renderItem={renderItem}
      />
    </>
  );
}

// Module constant: a fresh [0] each render would re-key the sticky header.
const STICKY_HEADER = [0];

const styles = StyleSheet.create({
  // No `gap` — each row carries its own ROW_GAP as a margin so the swipe
  // container stays the outermost box of a cell.
  list: { paddingHorizontal: 12, paddingBottom: 24 },
  // Opaque and full-bleed (the negative margin cancels the list's own inset), so
  // rows scroll UNDER the pinned chips instead of showing through the gutters.
  // The chip strips bring their own inset back.
  header: { backgroundColor: colors.bg, marginHorizontal: -12, paddingTop: 4 },
  grow: { flexGrow: 1 },
  emptyBox: {
    flex: 1,
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
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
