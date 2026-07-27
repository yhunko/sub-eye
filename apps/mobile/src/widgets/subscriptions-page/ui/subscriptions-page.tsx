import type { SubscriptionDto } from "@subeye/shared";
import { useQuery } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import {
  applySubscriptionFilters,
  hasActiveFilters,
  subscriptionFilters,
  subscriptionsQuery,
  useLifecycleActionBuilder,
  useSubscriptionFilters,
} from "@/entities/subscription";
import { m } from "@/shared/i18n";
import { colors } from "@/shared/ui/theme";
import { SubscriptionRow } from "./subscription-row";

export function SubscriptionsPage() {
  const router = useRouter();
  const list = useQuery(subscriptionsQuery());
  // Module store, not useState: the filter sheet is a separate route (the
  // navigator owns sheet presentation here), so it cannot read this component's
  // state. See entities/subscription/model/filters-store.
  const filters = useSubscriptionFilters();

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

  // Everything the filter sheet and the search field do happens right here, over
  // the array the query already holds. No debounce, no new query key, no
  // round-trip — the search field is instant because it never touches the
  // network.
  const visible = useMemo(
    () => applySubscriptionFilters(list.data ?? [], filters),
    [list.data, filters],
  );

  const hasAny = (list.data?.length ?? 0) > 0;
  const active = hasActiveFilters(filters);

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
          // Two SEPARATE header subviews, not two Pressables in one view: iOS 26
          // draws a single shared glass capsule around whatever one subview
          // contains, so a combined view reads as one control with two halves.
          // headerLeft/headerRight are distinct bar items and get a capsule each.
          // (`headerRightBarButtonItems` would be the richer native route, but
          // react-native-screens exposes it only on its own header config, not
          // through the navigator options expo-router forwards.)
          headerLeft: () => (
            <Pressable
              onPress={() => router.push("/subscriptions/filters")}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={m.subs_filterTitle()}
              accessibilityState={{ selected: active }}
            >
              <View style={styles.filterIcon}>
                <SymbolView
                  name={{
                    ios: "line.3.horizontal.decrease",
                    android: "filter_list",
                  }}
                  size={20}
                  tintColor={colors.text}
                />
                {/* A dot, not a tint change. Recolouring the glyph asks the user
                    to remember what the other colour meant; a dot is the
                    conventional "there is something set here" mark and reads at a
                    glance without knowing the resting state. */}
                {active ? <View style={styles.dot} /> : null}
              </View>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={() => router.push("/subscriptions/form")}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={m.subs_add()}
            >
              <Text style={styles.add}>+</Text>
            </Pressable>
          ),
          // `automatic` = UIKit's own choice, which here is a full-width field
          // under the nav bar that hides itself as the list scrolls. It costs a
          // row at rest and nothing while browsing, and it leaves the nav bar to
          // the two actions instead of three controls.
          //
          // NOT the iOS 26 bottom-of-screen search: that is a tab-bar feature
          // (`UITab.role = .search`), and expo-router's `NativeTabs.Trigger`
          // `role` maps to the legacy `UITabBarItem.systemItem` instead — a
          // normal tab with a magnifying-glass icon. Reaching the real one means
          // adding a fourth Search tab, which is a screen, not a config change.
          //
          // Styling stays minimal so the native control owns its appearance — a
          // custom barTintColor is what renders the glyph black on the dark
          // field. onChangeText writes straight to the filter store; no debounce
          // is needed because nothing fetches.
          headerSearchBarOptions: {
            placement: "automatic",
            placeholder: m.subs_searchPlaceholder(),
            autoCapitalize: "none",
            tintColor: colors.accent,
            textColor: colors.text,
            onChangeText: (event) =>
              subscriptionFilters.set({ search: event.nativeEvent.text }),
          },
        }}
      />
      <FlatList<SubscriptionDto>
        data={visible}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        // No cancelSearch hack here any more: that existed because
        // `integratedButton` ignores hideWhenScrolling. UIKit honours it for
        // this placement, so the field retracts on its own.
        onScrollBeginDrag={closeOpenRow}
        // ponytail: no getItemLayout. Rows are a fixed ROW_HEIGHT, so
        // VirtualizedList's own length estimate is exact after the first cell.
        contentContainerStyle={[styles.list, !visible.length && styles.grow]}
        ListEmptyComponent={
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

const styles = StyleSheet.create({
  // No `gap` — each row carries its own ROW_GAP as a margin so the swipe
  // container stays the outermost box of a cell.
  list: { paddingHorizontal: 12, paddingBottom: 24 },
  grow: { flexGrow: 1 },
  // The box exists ONLY to give the badge somewhere legal to sit. A native
  // header bar item clips to its content view, so the dot's old negative insets
  // put its outer edge outside the clip and shaved it into a wedge. Four points
  // of slack on each side keeps the whole dot inside the bounds; the glyph stays
  // optically centred because the slack is symmetric.
  filterIcon: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  // The corner of a 20pt SF Symbol's box is empty — the strokes never reach it —
  // so the dot still reads as sitting beside the glyph rather than on it.
  dot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
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
