import { useQuery } from "@tanstack/react-query";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text } from "react-native";
import { categoriesQuery } from "@/entities/category";
import { m } from "@/shared/i18n";
import { Field, TextField } from "@/shared/ui/field";
import { presentChoice } from "@/shared/ui/present-choice";
import { colors } from "@/shared/ui/theme";

/**
 * Sentinel for "the user chose New category…". It rides in `categoryId` rather
 * than a second piece of state so the form has exactly one source of truth for
 * what the category row is doing, and the submit path branches on it once.
 */
export const NEW_CATEGORY = "__new__";

export function CategoryField({
  categoryId,
  newCategoryName,
  onSelect,
  onNewCategoryName,
}: {
  categoryId: string | null;
  newCategoryName: string;
  onSelect: (next: string | null) => void;
  onNewCategoryName: (next: string) => void;
}) {
  const categories = useQuery(categoriesQuery());
  const label = m.form_category();
  const rows = categories.data ?? [];

  const selected = rows.find((row) => row.id === categoryId);
  const value =
    categoryId === NEW_CATEGORY
      ? m.form_categoryNew()
      : selected
        ? `${selected.emoji} ${selected.name}`
        : m.form_categoryNone();

  const open = () =>
    presentChoice(label, value, [
      { label: m.form_categoryNone(), onPress: () => onSelect(null) },
      ...rows.map((row) => ({
        label: `${row.emoji} ${row.name}`,
        onPress: () => onSelect(row.id),
      })),
      {
        label: m.form_categoryNew(),
        onPress: () => onSelect(NEW_CATEGORY),
      },
    ]);

  return (
    <>
      <Field label={label}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${value}`}
          onPress={open}
          style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
        >
          <Text style={styles.value}>{value}</Text>
          <SymbolView
            name={{ ios: "chevron.up.chevron.down", android: "unfold_more" }}
            size={13}
            tintColor={colors.muted}
            weight="semibold"
          />
        </Pressable>
      </Field>

      {/* Revealed in place rather than pushed as another sheet: this sheet is
          already a formSheet, and stacking one on top to collect a single word
          is a modal the user has to dismiss twice. A blank name here is not an
          error — it just means no category, same as choosing None. */}
      {categoryId === NEW_CATEGORY ? (
        <TextField
          label={m.form_categoryNewName()}
          value={newCategoryName}
          onChangeText={onNewCategoryName}
          autoCapitalize="sentences"
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pressed: { backgroundColor: colors.surfaceAlt },
  value: { flex: 1, fontSize: 16, color: colors.text },
});
