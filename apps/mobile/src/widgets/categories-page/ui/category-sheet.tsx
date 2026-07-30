import type { UpdateCategoryInput } from "@subeye/shared";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  categoriesQuery,
  pickCategoryEmoji,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "@/entities/category";
import { subscriptionsQuery } from "@/entities/subscription";
import { m } from "@/shared/i18n";
import { Field, TextField } from "@/shared/ui/field";
import { notifyWriteFailed } from "@/shared/ui/notify";
import { colors } from "@/shared/ui/theme";
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
  const { data: subscriptions } = useQuery(subscriptionsQuery());
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const remove = useDeleteCategory();

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

  // Deleting never removes a subscription — `subscriptions.category_id` is
  // `onDelete: "set null"`. So the confirm warns with the number that lands in
  // Uncategorized instead of blocking on a non-empty category.
  const affected = (subscriptions ?? []).filter(
    (item) => item.category?.id === id,
  ).length;

  const confirmDelete = () => {
    if (!category) return;
    Alert.alert(
      m.category_deleteTitle(),
      m.category_deleteBody({ name: category.name, count: affected }),
      [
        { text: m.common_cancel(), style: "cancel" },
        {
          text: m.action_delete(),
          style: "destructive",
          onPress: () => {
            remove.mutate(category.id, { onError: notifyWriteFailed });
            router.back();
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.sheet}
      contentContainerStyle={styles.content}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>
        {category ? m.category_editTitle() : m.category_newTitle()}
      </Text>

      <TextField
        label={m.form_name()}
        value={name}
        onChangeText={(next) => {
          setName(next);
          setError(undefined);
        }}
        error={error}
        autoFocus={!id}
        onSubmitEditing={submit}
      />

      {/* The selected tile is wherever it falls in a 120-tile scroll, so on a
          fresh sheet the derived emoji sits several screens down and the user
          cannot see what they are about to get. The label row shows it. */}
      <Field
        label={m.category_emoji()}
        accessory={
          <Text style={styles.currentEmoji} maxFontSizeMultiplier={1}>
            {shownEmoji}
          </Text>
        }
      >
        <EmojiGrid value={shownEmoji} onChange={setEmoji} />
      </Field>

      <Pressable
        style={styles.save}
        onPress={submit}
        accessibilityRole="button"
      >
        <Text style={styles.saveLabel}>{m.form_save()}</Text>
      </Pressable>

      {category ? (
        <Pressable
          style={({ pressed }) => [
            styles.delete,
            pressed && styles.deletePressed,
          ]}
          onPress={confirmDelete}
          accessibilityRole="button"
        >
          <Text style={styles.deleteLabel}>{m.action_delete()}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  title: {
    marginBottom: 20,
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  save: {
    marginTop: 8,
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 13,
  },
  saveLabel: { fontSize: 15, fontWeight: "700", color: colors.bg },
  currentEmoji: { marginBottom: 6, fontSize: 18 },
  delete: {
    marginTop: 10,
    alignItems: "center",
    borderRadius: 14,
    paddingVertical: 13,
  },
  deletePressed: { backgroundColor: colors.surface },
  deleteLabel: { fontSize: 15, fontWeight: "600", color: colors.danger },
  placeholder: {
    padding: 20,
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
  },
});
