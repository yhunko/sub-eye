import type { CategoryRecord } from "@subeye/store";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { type ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { categoriesQuery } from "@/entities/category";
import { subscriptionsQuery } from "@/entities/subscription";
import { m } from "@/shared/i18n";
import { RowCheck } from "@/shared/ui/list-row";
import { colors } from "@/shared/ui/theme";
import { categorySearch, useCategorySearch } from "../model/search-store";
import { useDeleteCategoryConfirm } from "../model/use-delete-category-confirm";

/**
 * Choosing rather than administering. Passed in by the subscription form's
 * route, which is the only layer that knows about both this screen and the
 * form's draft.
 */
export type CategoryPick = {
  /** `null` = the subscription is uncategorised. */
  selectedId: string | null;
  onSelect: (categoryId: string | null) => void;
};

/**
 * A row, and — when there is something destructive to reveal — its
 * swipe-to-delete, the same capsule reveal the subscriptions list uses.
 *
 * Picking has no delete: you are choosing a category, not maintaining the list,
 * and the gesture handler is skipped outright rather than rendered around an
 * empty action. That is not only tidiness — `ReanimatedSwipeable` mounts a pan
 * handler and a shared value per row.
 */
function CategoryRow({
  row,
  count,
  trailing,
  onPress,
  onDelete,
  onSwipeOpen,
}: {
  row: CategoryRecord;
  count: number;
  trailing: ReactNode;
  onPress: () => void;
  onDelete?: () => void;
  onSwipeOpen?: (swipeable: SwipeableMethods) => void;
}) {
  const swipeRef = useRef<SwipeableMethods>(null);
  // A ref, not state: a tap on an open row closes it instead of navigating, and
  // tracking that in state would re-render the row on every swipe.
  const isOpen = useRef(false);
  // The finger lifting at the end of a swipe also fires the row's press — see
  // the long note in ../../subscriptions-page/ui/subscription-row.tsx. Here it
  // opened the category editor on top of the revealed delete.
  const dragged = useRef(false);

  const renderRightActions = useCallback(
    () => (
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={m.action_delete()}
          onPress={() => {
            swipeRef.current?.close();
            onDelete?.();
          }}
          style={styles.action}
        >
          <View style={styles.pill}>
            <SymbolView
              name={{ ios: "trash.fill", android: "delete" }}
              size={19}
              tintColor="#ffffff"
              weight="semibold"
            />
          </View>
        </Pressable>
      </View>
    ),
    [onDelete],
  );

  const content = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.emoji} ${row.name}`}
      onPressIn={() => {
        dragged.current = false;
      }}
      onPress={() => {
        if (dragged.current) return;
        if (isOpen.current) {
          swipeRef.current?.close();
          return;
        }
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {/* The emoji is an icon that happens to be a glyph, and it holds a
          fixed column so the names line up — it is the one thing here that
          stays put while the text around it grows. */}
      <Text style={styles.emoji} maxFontSizeMultiplier={1}>
        {row.emoji}
      </Text>
      <Text style={styles.name}>{row.name}</Text>
      <Text style={styles.count}>{count}</Text>
      {trailing}
    </Pressable>
  );

  if (!onDelete) return content;

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      friction={1.6}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={renderRightActions}
      onSwipeableWillOpen={() => {
        if (swipeRef.current) onSwipeOpen?.(swipeRef.current);
      }}
      onSwipeableOpenStartDrag={() => {
        dragged.current = true;
      }}
      onSwipeableCloseStartDrag={() => {
        dragged.current = true;
      }}
      onSwipeableOpen={() => {
        isOpen.current = true;
      }}
      onSwipeableClose={() => {
        isOpen.current = false;
      }}
    >
      {content}
    </ReanimatedSwipeable>
  );
}

/**
 * The category list — Settings → Categories, and the subscription form's
 * picker. One screen, two jobs, because they were two screens rendering the
 * same rows and only one of them ever got a fix.
 *
 * The difference is the row's primary action, and that is all of it: managing,
 * a tap opens the editor and a swipe deletes; picking, a tap chooses and pops.
 * Both create through the same `CategorySheet`.
 *
 * Its chrome — title, the `+`, and the picker's search field — is declared on
 * each route's LAYOUT rather than here. None of it depends on anything this
 * screen holds, and options set from inside a screen are re-pushed through
 * `navigation.setOptions` on every render, which for the picker is once per
 * keystroke.
 */
export function CategoriesPage({ pick }: { pick?: CategoryPick }) {
  const router = useRouter();
  const categories = useQuery(categoriesQuery());
  const subscriptions = useQuery(subscriptionsQuery());
  const confirmDelete = useDeleteCategoryConfirm();
  const search = useCategorySearch();

  // The store outlives this screen, and the native field does not — it comes
  // back empty. Clearing on the way out is what stops the next visit opening
  // pre-filtered by a term with nothing on screen to explain it.
  useEffect(() => () => categorySearch.set(""), []);

  // Only one row may be open at a time, the way every native list behaves.
  const openRow = useRef<SwipeableMethods | null>(null);
  const handleSwipeOpen = useCallback((swipeable: SwipeableMethods) => {
    if (openRow.current && openRow.current !== swipeable) {
      openRow.current.close();
    }
    openRow.current = swipeable;
  }, []);

  // Counted from the list the app already holds, not from a new endpoint. The
  // subscriptions query is loaded app-wide (the reminder sync mounts it), so
  // this is a scan over an array that is already in memory.
  const counts = useMemo(() => {
    const tally = new Map<string, number>();
    for (const item of subscriptions.data ?? []) {
      const id = item.category?.id;
      if (id) tally.set(id, (tally.get(id) ?? 0) + 1);
    }
    return tally;
  }, [subscriptions.data]);

  const all = categories.data;
  // Only the picker carries a search field, so `search` is always "" without one
  // and this collapses to the identity.
  const needle = search.trim().toLowerCase();
  const rows = useMemo(
    () =>
      needle
        ? (all ?? []).filter((row) => row.name.toLowerCase().includes(needle))
        : (all ?? []),
    [all, needle],
  );

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
      onScrollBeginDrag={() => {
        openRow.current?.close();
        openRow.current = null;
      }}
    >
      {!all && categories.isLoading ? (
        <ActivityIndicator color={colors.accent} />
      ) : null}
      {!all && categories.isError ? (
        <Text style={styles.placeholder}>{m.common_loadFailed()}</Text>
      ) : null}

      {all && rows.length === 0 && !pick ? (
        <Text style={styles.placeholder}>{m.category_empty()}</Text>
      ) : null}

      {pick || rows.length ? (
        <View style={styles.group}>
          {/* Always first and never filtered out: "no category" is not a search
              result, it is the way back to having none. */}
          {pick ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: pick.selectedId === null }}
              accessibilityLabel={m.form_categoryNone()}
              onPress={() => pick.onSelect(null)}
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
              ]}
            >
              <Text
                style={[
                  styles.name,
                  styles.noneName,
                  pick.selectedId === null && styles.nameSelected,
                ]}
              >
                {m.form_categoryNone()}
              </Text>
              <RowCheck checked={pick.selectedId === null} />
            </Pressable>
          ) : null}

          {rows.map((row, index) => (
            <View key={row.id}>
              {index > 0 || pick ? <View style={styles.divider} /> : null}
              <CategoryRow
                row={row}
                count={counts.get(row.id) ?? 0}
                trailing={
                  pick ? (
                    <RowCheck checked={pick.selectedId === row.id} />
                  ) : (
                    <SymbolView
                      name={{ ios: "chevron.right", android: "chevron_right" }}
                      size={13}
                      tintColor={colors.muted}
                      weight="semibold"
                    />
                  )
                }
                onPress={() =>
                  pick
                    ? pick.onSelect(row.id)
                    : router.push({
                        pathname: "/settings/categories/[id]",
                        params: { id: row.id },
                      })
                }
                onDelete={pick ? undefined : () => confirmDelete(row)}
                onSwipeOpen={pick ? undefined : handleSwipeOpen}
              />
            </View>
          ))}
        </View>
      ) : null}

      {/* Managing only. In the picker its second sentence describes the very
          screen the reader is standing on. */}
      {pick ? null : (
        <Text style={styles.footnote}>{m.category_listHint()}</Text>
      )}
    </ScrollView>
  );
}

// Same inset as the Settings list: row padding (16) + emoji column (24) + gap
// (13), so the rule starts under the name.
const DIVIDER_INSET = 53;

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24, gap: 8 },
  group: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    overflow: "hidden",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: DIVIDER_INSET,
  },
  // OPAQUE, even though the group behind it is the same colour: the row slides
  // over its delete action, and a transparent one would let the action show
  // through it for the whole drag.
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 52,
    backgroundColor: colors.surface,
  },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  // The subscriptions list's capsule, WITHOUT its caption underneath. These rows
  // are 52pt to that list's 64, and stacking a caption pushes the capsule to
  // within 2pt of the row top — which on the first row is exactly where the
  // group's 24pt corner radius clips it. Centred and captionless, it clears.
  // One action, and the glyph is a trash can; the word survives as the
  // accessibility label.
  actions: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 8,
    paddingRight: 6,
  },
  action: { alignItems: "center", minWidth: 54 },
  pill: {
    width: 54,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.danger,
  },
  emoji: { width: 24, fontSize: 20 },
  name: { flex: 1, fontSize: 16, color: colors.text },
  // No emoji to sit behind, so it pays the emoji column itself and the rule
  // above it still lands under the names.
  noneName: { marginLeft: DIVIDER_INSET - 16 },
  nameSelected: { fontWeight: "600", color: colors.accent },
  count: { fontSize: 16, color: colors.muted },
  footnote: {
    fontSize: 12.5,
    color: colors.muted,
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  placeholder: { fontSize: 14, color: colors.muted, textAlign: "center" },
});
