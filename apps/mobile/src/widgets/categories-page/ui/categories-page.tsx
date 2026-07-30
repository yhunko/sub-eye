import { useQuery } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { categoriesQuery } from "@/entities/category";
import { subscriptionsQuery } from "@/entities/subscription";
import { m } from "@/shared/i18n";
import { colors, LAYOUT_FONT_SCALE_MAX } from "@/shared/ui/theme";

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

  const openNew = () => router.push("/settings/categories/new");

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
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${row.emoji} ${row.name}`}
                  onPress={() =>
                    router.push({
                      pathname: "/settings/categories/[id]",
                      params: { id: row.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.rowPressed,
                  ]}
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
                    {counts.get(row.id) ?? 0}
                  </Text>
                  <SymbolView
                    name={{ ios: "chevron.right", android: "chevron_right" }}
                    size={13}
                    tintColor={colors.muted}
                    weight="semibold"
                  />
                </Pressable>
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  rowPressed: { backgroundColor: colors.surfaceAlt },
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
