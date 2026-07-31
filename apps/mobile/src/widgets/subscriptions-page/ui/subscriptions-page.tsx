import type { SubscriptionDto } from "@subeye/shared";
import { useQuery } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { categoriesQuery } from "@/entities/category";
import { usePro } from "@/entities/pro";
import {
  ALL_KEY,
  applySubscriptionFilters,
  DEFAULT_SUBSCRIPTION_FILTERS,
  groupSubscriptions,
  hasActiveFilters,
  type SubscriptionGroupBy,
  type SubscriptionSection,
  type SubscriptionSort,
  type SubscriptionStatusFilter,
  subscriptionFilters,
  subscriptionsQuery,
  useLifecycleActionBuilder,
  useSubscriptionFilters,
} from "@/entities/subscription";
import { m } from "@/shared/i18n";
import { colors } from "@/shared/ui/theme";
import { SectionHeading } from "./section-heading";
import { SubscriptionRow } from "./subscription-row";

// Message-function references, invoked at render — never m.*() at module scope.
const SORTS: { value: SubscriptionSort; label: () => string }[] = [
  { value: "next", label: m.subs_sort_next },
  { value: "name", label: m.subs_sort_name },
  { value: "cost", label: m.subs_sort_cost },
];

const GROUPS: { value: SubscriptionGroupBy; label: () => string }[] = [
  { value: "none", label: m.form_categoryNone },
  { value: "category", label: m.form_category },
  { value: "period", label: m.subs_group_period },
  { value: "currency", label: m.form_currency },
];

const STATUSES: { value: SubscriptionStatusFilter; label: () => string }[] = [
  { value: "all", label: m.subs_status_all },
  { value: "active", label: m.subs_status_active },
  { value: "paused", label: m.subs_status_paused },
  { value: "cancelling", label: m.subs_status_cancelling },
  { value: "cancelled", label: m.subs_status_cancelled },
];

/** UIMenu's own selected/unselected state — the checkmark UIKit draws for us. */
const checked = (selected: boolean): "on" | "off" => (selected ? "on" : "off");

/**
 * "Status · Paused" while a dimension is doing something, plain "Status" while
 * it sits at its default.
 *
 * UIKit gives a submenu a label and nothing else — no `subtitle`, no trailing
 * value, no per-item tint — so the choice has to live in the label, and a label
 * spelling out every default turned the menu into four sentences nobody needed
 * to read. Silence IS the resting state; the values that survive are the short
 * ones, because every default happens to be the longest string in its list.
 *
 * The filled glyph at each call site is the other half: it marks WHICH row is
 * doing something at a glance, before any of the text is read.
 */
function labelWith<T>(
  label: string,
  options: { value: T; label: () => string }[],
  value: T,
  isSet: boolean,
): string {
  if (!isSet) return label;
  const selected = options.find((option) => option.value === value)?.label();
  return selected ? `${label} · ${selected}` : label;
}

export function SubscriptionsPage() {
  const router = useRouter();
  const list = useQuery(subscriptionsQuery());
  // Module store, not useState: Android's fallback lives in a separate route
  // (the navigator owns sheet presentation here), so it cannot read this
  // component's state. See entities/subscription/model/filters-store.
  const filters = useSubscriptionFilters();
  const isPro = usePro();
  // Only fetched for the menu's category submenu; the list itself carries the
  // category on every row.
  const categories = useQuery(categoriesQuery());

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

  // Everything the menu and the search field do happens right here, over the
  // array the query already holds. No debounce, no new query key, no round-trip
  // — the search field is instant because it never touches the network.
  const visible = useMemo(
    () => applySubscriptionFilters(list.data ?? [], filters),
    [list.data, filters],
  );

  // Grouping runs AFTER filtering and sorting, over the array those produced, so
  // each section keeps the user's chosen order inside itself.
  const sections = useMemo(
    () => groupSubscriptions(visible, filters.group),
    [visible, filters.group],
  );

  const hasAny = (list.data?.length ?? 0) > 0;
  const narrowed = hasActiveFilters(filters);

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

  const openForm = useCallback(
    () => router.push("/subscriptions/form"),
    [router],
  );

  const categoryRows = categories.data ?? [];

  // What each dimension compares against to decide whether it is worth
  // announcing. Defaults live in the entity, so "resting" here and "resting" in
  // the filter store cannot drift apart.
  const sortSet = filters.sort !== DEFAULT_SUBSCRIPTION_FILTERS.sort;
  const groupSet = filters.group !== DEFAULT_SUBSCRIPTION_FILTERS.group;
  const statusSet = filters.status !== DEFAULT_SUBSCRIPTION_FILTERS.status;
  const categorySet = filters.categoryId !== null;

  // Grouping by category is dropped for the same reason the category FILTER
  // below is: a free account cannot create or assign one, so the choice sorts
  // every subscription into a single uncategorised section. The lock row that
  // replaces the filter carries the upsell for both.
  const groups = isPro
    ? GROUPS
    : GROUPS.filter((option) => option.value !== "category");

  /**
   * Without Pro the category filter is a single row into the paywall rather
   * than a submenu of choices the account cannot make; with Pro but no
   * categories it is nothing at all, because a lone "All categories" row
   * filters exactly zero rows.
   */
  const categoryEntry = !isPro
    ? [
        {
          type: "action" as const,
          label: m.paywall_lockFilter(),
          icon: { type: "sfSymbol" as const, name: "lock" as const },
          onPress: () => router.push("/paywall"),
        },
      ]
    : categoryRows.length
      ? [
          {
            type: "submenu" as const,
            label: categorySet
              ? `${m.form_category()} · ${
                  categoryRows.find(
                    (category) => category.id === filters.categoryId,
                  )?.name ?? ""
                }`
              : m.form_category(),
            icon: {
              type: "sfSymbol" as const,
              name: categorySet ? ("tag.fill" as const) : ("tag" as const),
            },
            items: [
              {
                type: "action" as const,
                label: m.subs_categoryAll(),
                state: checked(filters.categoryId === null),
                onPress: () => subscriptionFilters.set({ categoryId: null }),
              },
              ...categoryRows.map((category) => ({
                type: "action" as const,
                label: `${category.emoji} ${category.name}`,
                state: checked(filters.categoryId === category.id),
                onPress: () =>
                  subscriptionFilters.set({ categoryId: category.id }),
              })),
            ],
          },
        ]
      : [];

  /**
   * iOS: one real UIMenu behind the nav bar's trailing item. Every submenu is
   * single-selection by default (`multiselectable` is false unless asked), so
   * UIKit draws the checkmarks, dismisses on choice and animates the whole thing
   * — none of which a sheet full of hand-rolled rows was ever going to match.
   *
   * A dimension at its default is a plain glyph and a bare noun. One that is not
   * takes the FILLED variant of the same glyph — the only per-row emphasis UIKit
   * offers here, since menu items cannot be tinted — and says what it is set to.
   */
  const listMenu = () => [
    {
      type: "submenu" as const,
      label: labelWith(m.subs_filterSort(), SORTS, filters.sort, sortSet),
      icon: {
        type: "sfSymbol" as const,
        name: sortSet
          ? ("arrow.up.arrow.down.circle.fill" as const)
          : ("arrow.up.arrow.down" as const),
      },
      items: SORTS.map((option) => ({
        type: "action" as const,
        label: option.label(),
        state: checked(filters.sort === option.value),
        onPress: () => subscriptionFilters.set({ sort: option.value }),
      })),
    },
    {
      type: "submenu" as const,
      label: labelWith(m.subs_groupBy(), groups, filters.group, groupSet),
      icon: {
        type: "sfSymbol" as const,
        name: groupSet
          ? ("square.grid.2x2.fill" as const)
          : ("square.grid.2x2" as const),
      },
      items: groups.map((option) => ({
        type: "action" as const,
        label: option.label(),
        state: checked(filters.group === option.value),
        onPress: () => subscriptionFilters.set({ group: option.value }),
      })),
    },
    {
      type: "submenu" as const,
      label: labelWith(
        m.subs_filterStatus(),
        STATUSES,
        filters.status,
        statusSet,
      ),
      icon: {
        type: "sfSymbol" as const,
        name: statusSet
          ? ("line.3.horizontal.decrease.circle.fill" as const)
          : ("line.3.horizontal.decrease" as const),
      },
      items: STATUSES.map((option) => ({
        type: "action" as const,
        label: option.label(),
        state: checked(filters.status === option.value),
        onPress: () => subscriptionFilters.set({ status: option.value }),
      })),
    },
    ...categoryEntry,
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: m.subscriptions_title(),
          // Native UIBarButtonItems, not custom subviews: iOS 26 gives each item
          // its own glass capsule, `prominent` is UIKit's own filled style, and a
          // `menu` item carries a real UIMenu instead of an action sheet. expo-
          // router only swaps these in on iOS, so the Pressables below stay as
          // the Android path.
          unstable_headerLeftItems: () => [
            {
              type: "button" as const,
              label: m.subs_add(),
              icon: { type: "sfSymbol" as const, name: "plus" as const },
              variant: "prominent" as const,
              tintColor: colors.accent,
              onPress: openForm,
            },
          ],
          unstable_headerRightItems: () => [
            {
              type: "menu" as const,
              label: m.subs_listOptions(),
              // The glyph itself carries "rows are hidden" — a filled filter
              // icon where an ellipsis normally sits is a state you can read
              // without remembering what a coloured dot meant.
              icon: {
                type: "sfSymbol" as const,
                name: narrowed
                  ? ("line.3.horizontal.decrease.circle.fill" as const)
                  : ("ellipsis.circle" as const),
              },
              tintColor: narrowed ? colors.accent : colors.text,
              // `multiselectable` on the OUTER menu, whose children are all
              // submenus and therefore have no selected state to police. Left
              // unset, expo-router sends `singleSelection: true` here as well as
              // on each submenu, which puts UIMenuOptionsSingleSelection on a
              // menu that owns no actions — the prime suspect for the checkmarks
              // going missing inside the submenus. Each submenu keeps the
              // single-selection default, which is where it means something.
              menu: { multiselectable: true, items: listMenu() },
            },
          ],
          headerLeft: () => (
            <Pressable
              onPress={openForm}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={m.subs_add()}
            >
              <Text style={styles.add}>+</Text>
            </Pressable>
          ),
          // Android has no bar-button menus; the sheet route is the fallback and
          // carries the same four dimensions as rows.
          headerRight: () => (
            <Pressable
              onPress={() => router.push("/subscriptions/filters")}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={m.subs_listOptions()}
              accessibilityState={{ selected: narrowed }}
            >
              <SymbolView
                name={{ ios: "ellipsis.circle", android: "more_vert" }}
                size={22}
                tintColor={narrowed ? colors.accent : colors.text}
              />
            </Pressable>
          ),
          // `stacked` + `hideWhenScrolling: false` — a field pinned below the
          // nav bar that never leaves. `automatic` let UIKit pick, and what it
          // picked was a field that retracts on the first scroll: on a list long
          // enough to want searching, the control is off-screen exactly when it
          // is wanted, and getting it back means scrolling to the top first.
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
            placement: "stacked",
            hideWhenScrolling: false,
            placeholder: m.subs_searchPlaceholder(),
            autoCapitalize: "none",
            tintColor: colors.accent,
            textColor: colors.text,
            onChangeText: (event) =>
              subscriptionFilters.set({ search: event.nativeEvent.text }),
          },
        }}
      />
      <SectionList<SubscriptionDto, SubscriptionSection>
        sections={sections}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        // No cancelSearch hack here any more: that existed because
        // `integratedButton` ignores hideWhenScrolling. This placement honours
        // it, and what it is set to is `false` — the field stays put.
        onScrollBeginDrag={closeOpenRow}
        // ponytail: no getItemLayout. Rows are a fixed ROW_HEIGHT, so
        // VirtualizedList's own length estimate is exact after the first cell.
        //
        // Headings do NOT stick. They are borderless text on the page
        // background, so a pinned one would have rows sliding visibly through
        // its letters — sticking needs a solid or blurred bar behind it, which
        // is chrome this list does not otherwise have.
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[styles.list, !sections.length && styles.grow]}
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
        renderSectionHeader={({ section }) =>
          section.key === ALL_KEY ? null : (
            <SectionHeading section={section} groupBy={filters.group} />
          )
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
  // Android only — iOS draws a real `plus` bar button item. A glyph, not an icon
  // dependency: "+" is the one affordance that needs no legend.
  add: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "300",
    color: colors.accent,
  },
});
