import type { UpdateCategoryInput } from "@subeye/model";
import { useQuery } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  categoriesQuery,
  pickCategoryEmoji,
  useCreateCategory,
  useUpdateCategory,
} from "@/entities/category";
import { m } from "@/shared/i18n";
import { Field } from "@/shared/ui/field";
import { notifyWriteFailed } from "@/shared/ui/notify";
import { colors } from "@/shared/ui/theme";
import { useDeleteCategoryConfirm } from "../model/use-delete-category-confirm";
import { EmojiGrid } from "./emoji-grid";

/**
 * One category. With an `id` it renames / re-emojis / deletes; without one it
 * creates. Reached from Settings → Categories — the + and a row.
 *
 * Creating is deliberately two taps and a word: the field is focused on open,
 * the return key submits, and until the user touches the grid the emoji tracks
 * `pickCategoryEmoji(name)`. Picking one is a choice, not a step.
 */
export function CategorySheet({ id }: { id?: string }) {
  const router = useRouter();
  const { data: categories } = useQuery(categoriesQuery());
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const confirmDeleteCategory = useDeleteCategoryConfirm();

  const category = id ? categories?.find((row) => row.id === id) : undefined;

  const [name, setName] = useState("");
  // null means "follow the name". Any tap on the grid pins a choice, including
  // one that lands on the emoji the name was already deriving.
  const [emoji, setEmoji] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  // Seeded ONCE. categoriesQuery refetches on mount, and re-seeding when the
  // response lands would wipe whatever the user had already typed.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !category) return;
    seeded.current = true;
    setName(category.name);
    setEmoji(category.emoji);
  }, [category]);

  if (id && !category) {
    return (
      <View style={styles.sheet}>
        <Text style={styles.placeholder}>{m.common_loadFailed()}</Text>
      </View>
    );
  }

  const shownEmoji =
    emoji ?? (category ? category.emoji : pickCategoryEmoji(name));

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(m.validation_required());
      return;
    }

    // The server would happily store "Music" beside "music", and two rows that
    // read identically in the picker is a bug the user has to untangle later.
    const clash = (categories ?? []).some(
      (row) =>
        row.id !== id &&
        row.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (clash) {
      setError(m.category_duplicate());
      return;
    }

    if (!category) {
      create.mutate(
        { name: trimmed, emoji: shownEmoji },
        { onError: notifyWriteFailed },
      );
      router.back();
      return;
    }

    // Only what actually moved: UpdateCategorySchema takes both fields as
    // optional, and sending an unchanged emoji is a write for nothing.
    const changes: UpdateCategoryInput = {};
    if (trimmed !== category.name) changes.name = trimmed;
    if (shownEmoji !== category.emoji) changes.emoji = shownEmoji;

    if (changes.name !== undefined || changes.emoji !== undefined) {
      update.mutate(
        { id: category.id, changes },
        { onError: notifyWriteFailed },
      );
    }
    router.back();
  };

  const confirmDelete = () => {
    if (category) confirmDeleteCategory(category, router.back);
  };

  // Save and delete belong to the nav bar, not the content: the emoji grid is
  // 120 tiles, so anything under it is below the fold of a 0.9-detent sheet and
  // a user has to scroll past every emoji to commit a name they already typed.
  // iOS gets real bar button items; the Pressables are Android's path, which
  // expo-router does not swap.
  const deleteItem = {
    type: "button" as const,
    label: m.action_delete(),
    icon: { type: "sfSymbol" as const, name: "trash" as const },
    tintColor: colors.danger,
    onPress: confirmDelete,
  };
  const saveItem = {
    type: "button" as const,
    // The label survives as the accessibility name — UIKit draws the glyph and
    // drops the title once an image is set, the way `plus` does on the list.
    label: m.form_save(),
    icon: { type: "sfSymbol" as const, name: "checkmark" as const },
    variant: "prominent" as const,
    tintColor: colors.accent,
    onPress: submit,
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: category ? m.category_editTitle() : m.category_newTitle(),
          unstable_headerLeftItems: () => (category ? [deleteItem] : []),
          unstable_headerRightItems: () => [saveItem],
          headerLeft: category
            ? () => (
                <Pressable
                  onPress={confirmDelete}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={m.action_delete()}
                >
                  <SymbolView
                    name={{ ios: "trash", android: "delete" }}
                    size={22}
                    tintColor={colors.danger}
                  />
                </Pressable>
              )
            : undefined,
          headerRight: () => (
            <Pressable
              onPress={submit}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={m.form_save()}
            >
              <SymbolView
                name={{ ios: "checkmark", android: "check" }}
                size={22}
                tintColor={colors.accent}
              />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {/* The emoji leads the name field instead of sitting in a label row.
            The selected tile is wherever it falls in a 120-tile scroll, so on a
            fresh sheet the derived emoji is several screens down — this is the
            only place the user can see what they are about to get, and next to
            the name is where it will be read in every list afterwards. */}
        <View style={styles.nameRow}>
          <Text style={styles.namePrefix} maxFontSizeMultiplier={1}>
            {shownEmoji}
          </Text>
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={(next) => {
              setName(next);
              setError(undefined);
            }}
            placeholder={m.form_name()}
            placeholderTextColor={colors.muted}
            // The caret and selection default to system blue, which is the one
            // colour in the app that belongs to no token.
            selectionColor={colors.accent}
            autoCapitalize="sentences"
            autoCorrect={false}
            autoFocus={!id}
            onSubmitEditing={submit}
            returnKeyType="done"
            keyboardAppearance="dark"
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Field label={m.category_emoji()}>
          <EmojiGrid value={shownEmoji} onChange={setEmoji} />
        </Field>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  // An inset-grouped row, not a bordered box: one filled surface, no outline,
  // 17pt — what a single-field iOS form looks like. `minHeight` rather than a
  // height so the row still grows with Dynamic Type.
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    minHeight: 52,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  namePrefix: { fontSize: 24 },
  nameInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 17,
    color: colors.text,
  },
  // Sits in the gap the name row already reserves, so showing it moves nothing.
  error: {
    marginTop: -10,
    marginBottom: 10,
    fontSize: 13,
    color: colors.danger,
  },
  placeholder: {
    padding: 20,
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
  },
});
