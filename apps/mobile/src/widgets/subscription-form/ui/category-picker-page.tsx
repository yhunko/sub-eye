import { useQuery } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { categoriesQuery, useCreateCategory } from "@/entities/category";
import { m } from "@/shared/i18n";
import { nativeSearchBarChrome } from "@/shared/ui/header";
import { notifyWriteFailed } from "@/shared/ui/notify";
import { colors, LAYOUT_FONT_SCALE_MAX } from "@/shared/ui/theme";
import { useSubscriptionForm } from "../model/form-context";

/**
 * Choose a category, or type a name that does not exist yet and create it here.
 *
 * This is the drill-down the form modal's own stack exists for. It replaces an
 * ActionSheet listing every category, which had no search, no create, and grew
 * unusable somewhere around a dozen entries.
 *
 * Create-in-place is why the search text doubles as the new category's name: the
 * user has already typed it by the time they discover nothing matches, and
 * asking again in a second field is the step the web dropdown was right to skip.
 */
export function CategoryPickerPage() {
  const router = useRouter();
  const { values, set } = useSubscriptionForm();
  const categories = useQuery(categoriesQuery());
  const createCategory = useCreateCategory();
  const [search, setSearch] = useState("");

  const rows = categories.data;
  const needle = search.trim().toLowerCase();

  const visible = useMemo(
    () =>
      needle
        ? (rows ?? []).filter((row) => row.name.toLowerCase().includes(needle))
        : (rows ?? []),
    [rows, needle],
  );

  // Offered only when the typed name is not already taken — case-insensitively,
  // because the server would happily store "Music" beside "music".
  const canCreate =
    needle.length > 0 &&
    !(rows ?? []).some((row) => row.name.trim().toLowerCase() === needle);

  const choose = (categoryId: string | null) => {
    set("categoryId", categoryId);
    router.back();
  };

  const createAndChoose = () => {
    if (createCategory.isPending) return;
    createCategory.mutate(
      { name: search.trim() },
      {
        onSuccess: (created) => choose(created.id),
        onError: notifyWriteFailed,
      },
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: m.form_category(),
          headerSearchBarOptions: {
            ...nativeSearchBarChrome,
            // Not the list's plain "Search": typing a name that matches nothing
            // offers to create it, and that is the only way to make a category
            // from here. A field labelled "Search" hides the feature entirely.
            placeholder: m.form_categorySearchOrCreate(),
            // A category name is a proper noun, so this one field capitalises.
            autoCapitalize: "sentences",
            onChangeText: (event) => setSearch(event.nativeEvent.text),
          },
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {!rows && categories.isLoading ? (
          <ActivityIndicator color={colors.muted} style={styles.spinner} />
        ) : null}

        <View style={styles.group}>
          {/* Always first and never filtered out: "no category" is not a search
              result, it is the way back to having none. */}
          <Row
            label={m.form_categoryNone()}
            selected={values.categoryId === null}
            first
            onPress={() => choose(null)}
          />
          {visible.map((row) => (
            <Row
              key={row.id}
              label={`${row.emoji} ${row.name}`}
              selected={values.categoryId === row.id}
              first={false}
              onPress={() => choose(row.id)}
            />
          ))}
        </View>

        {canCreate ? (
          <Pressable
            accessibilityRole="button"
            onPress={createAndChoose}
            disabled={createCategory.isPending}
            style={({ pressed }) => [
              styles.group,
              styles.row,
              pressed && styles.rowPressed,
            ]}
          >
            {createCategory.isPending ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <SymbolView
                name={{ ios: "plus.circle.fill", android: "add_circle" }}
                size={19}
                tintColor={colors.accent}
              />
            )}
            <Text
              style={styles.createLabel}
              numberOfLines={1}
              maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
            >
              {m.form_categoryCreate({ name: search.trim() })}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </>
  );
}

function Row({
  label,
  selected,
  first,
  onPress,
}: {
  label: string;
  selected: boolean;
  first: boolean;
  onPress: () => void;
}) {
  return (
    <>
      {first ? null : <View style={styles.divider} />}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <Text
          style={[styles.rowLabel, selected && styles.rowLabelSelected]}
          numberOfLines={1}
          maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
        >
          {label}
        </Text>
        {selected ? (
          <SymbolView
            name={{ ios: "checkmark", android: "check" }}
            size={15}
            tintColor={colors.accent}
            weight="semibold"
          />
        ) : null}
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  group: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    overflow: "hidden",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    minHeight: 50,
  },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  rowLabel: { flex: 1, fontSize: 16, color: colors.text },
  rowLabelSelected: { fontWeight: "600", color: colors.accent },
  createLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: colors.accent,
  },
  spinner: { marginTop: 24 },
});
