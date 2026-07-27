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
  useDeleteCategory,
  useUpdateCategory,
} from "@/entities/category";
import { subscriptionsQuery } from "@/entities/subscription";
import { m } from "@/shared/i18n";
import { Field, TextField } from "@/shared/ui/field";
import { notifyWriteFailed } from "@/shared/ui/notify";
import { colors } from "@/shared/ui/theme";
import { EmojiGrid } from "./emoji-grid";

/** Rename, re-emoji or delete one category. Reached from Settings → Categories. */
export function CategoryEditSheet({ id }: { id: string }) {
  const router = useRouter();
  const { data: categories } = useQuery(categoriesQuery());
  const { data: subscriptions } = useQuery(subscriptionsQuery());
  const update = useUpdateCategory();
  const remove = useDeleteCategory();

  const category = categories?.find((row) => row.id === id);

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
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

  if (!category) {
    return (
      <View style={styles.sheet}>
        <Text style={styles.placeholder}>{m.common_loadFailed()}</Text>
      </View>
    );
  }

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(m.validation_required());
      return;
    }

    // Only what actually moved: UpdateCategorySchema takes both fields as
    // optional, and sending an unchanged emoji is a write for nothing.
    const changes: UpdateCategoryInput = {};
    if (trimmed !== category.name) changes.name = trimmed;
    if (emoji !== category.emoji) changes.emoji = emoji;

    if (changes.name !== undefined || changes.emoji !== undefined) {
      update.mutate({ id, changes }, { onError: notifyWriteFailed });
    }
    router.back();
  };

  // Deleting never removes a subscription — `subscriptions.category_id` is
  // `onDelete: "set null"`. So the confirm warns with the number that lands in
  // Uncategorized instead of blocking on a non-empty category.
  const affected = (subscriptions ?? []).filter(
    (item) => item.category?.id === id,
  ).length;

  const confirmDelete = () =>
    Alert.alert(
      m.category_deleteTitle(),
      m.category_deleteBody({ name: category.name, count: affected }),
      [
        { text: m.common_cancel(), style: "cancel" },
        {
          text: m.action_delete(),
          style: "destructive",
          onPress: () => {
            remove.mutate(id, { onError: notifyWriteFailed });
            router.back();
          },
        },
      ],
    );

  return (
    <ScrollView
      style={styles.sheet}
      contentContainerStyle={styles.content}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>{m.category_editTitle()}</Text>

      <TextField
        label={m.form_name()}
        value={name}
        onChangeText={(next) => {
          setName(next);
          setError(undefined);
        }}
        error={error}
      />

      <Field label={m.category_emoji()}>
        <EmojiGrid value={emoji} onChange={setEmoji} />
      </Field>

      <Pressable
        style={styles.save}
        onPress={submit}
        accessibilityRole="button"
      >
        <Text style={styles.saveLabel}>{m.form_save()}</Text>
      </Pressable>

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
