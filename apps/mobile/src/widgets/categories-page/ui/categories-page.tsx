import type { CategoryRecord } from "@subeye/store";
import { useQuery } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useMemo, useRef } from "react";
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
import { colors, LAYOUT_FONT_SCALE_MAX } from "@/shared/ui/theme";
import { useDeleteCategoryConfirm } from "../model/use-delete-category-confirm";

/**
 * A row plus its swipe-to-delete, the same capsule-and-caption reveal the
 * subscriptions list uses. Delete is the one action here that is not already a
 * tap away inside the sheet, and it is the one worth reaching without opening
 * anything — so it is the only thing behind the swipe.
 */
function CategoryRow({
  row,
  count,
  onPress,
  onDelete,
  onSwipeOpen,
}: {
  row: CategoryRecord;
  count: number;
  onPress: () => void;
  onDelete: () => void;
  onSwipeOpen: (swipeable: SwipeableMethods) => void;
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
            onDelete();
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

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      friction={1.6}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={renderRightActions}
      onSwipeableWillOpen={() => {
        if (swipeRef.current) onSwipeOpen(swipeRef.current);
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
        <Text style={styles.emoji} maxFontSizeMultiplier={1}>
          {row.emoji}
        </Text>
        <Text
          style={styles.name}
          numberOfLines={1}
          maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
        >
          {row.name}
        </Text>
        <Text style={styles.count} maxFontSizeMultiplier={1}>
          {count}
        </Text>
        <SymbolView
          name={{ ios: "chevron.right", android: "chevron_right" }}
          size={13}
          tintColor={colors.muted}
          weight="semibold"
        />
      </Pressable>
    </ReanimatedSwipeable>
  );
}

/**
 * Settings → Categories.
 *
 * The app could create categories it could never rename or remove — the server
 * has supported all three since v4 and none of it was reachable.
 *
 * The + here is the second create path, not a replacement: the subscription
 * form still creates inline from whatever was typed into its search field,
 * which is the faster route when you are already filing something.
 */
export function CategoriesPage() {
  const router = useRouter();
  const categories = useQuery(categoriesQuery());
  const subscriptions = useQuery(subscriptionsQuery());
  const confirmDelete = useDeleteCategoryConfirm();

  const openNew = () => router.push("/settings/categories/new");

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

  const rows = categories.data ?? [];

  return (
    <>
      <Stack.Screen
        options={{
          // A real UIBarButtonItem — iOS 26 gives it its own glass capsule.
          // expo-router only swaps these in on iOS, so the Pressable stays as
          // the Android path.
          unstable_headerRightItems: () => [
            {
              type: "button" as const,
              label: m.category_add(),
              icon: { type: "sfSymbol" as const, name: "plus" as const },
              variant: "prominent" as const,
              tintColor: colors.accent,
              onPress: openNew,
            },
          ],
          headerRight: () => (
            <Pressable
              onPress={openNew}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={m.category_add()}
            >
              <SymbolView
                name={{ ios: "plus", android: "add" }}
                size={22}
                tintColor={colors.accent}
              />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        onScrollBeginDrag={() => {
          openRow.current?.close();
          openRow.current = null;
        }}
      >
        {!categories.data && categories.isLoading ? (
          <ActivityIndicator color={colors.accent} />
        ) : null}
        {!categories.data && categories.isError ? (
          <Text style={styles.placeholder}>{m.common_loadFailed()}</Text>
        ) : null}

        {categories.data && rows.length === 0 ? (
          <Text style={styles.placeholder}>{m.category_empty()}</Text>
        ) : null}

        {rows.length ? (
          <View style={styles.group}>
            {rows.map((row, index) => (
              <View key={row.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <CategoryRow
                  row={row}
                  count={counts.get(row.id) ?? 0}
                  onPress={() =>
                    router.push({
                      pathname: "/settings/categories/[id]",
                      params: { id: row.id },
                    })
                  }
                  onDelete={() => confirmDelete(row)}
                  onSwipeOpen={handleSwipeOpen}
                />
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.footnote}>{m.category_listHint()}</Text>
      </ScrollView>
    </>
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
  count: { fontSize: 16, color: colors.muted },
  footnote: {
    fontSize: 12.5,
    color: colors.muted,
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  placeholder: { fontSize: 14, color: colors.muted, textAlign: "center" },
});
