import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { Alert } from "react-native";
import { useDeleteCategory } from "@/entities/category";
import { subscriptionsQuery } from "@/entities/subscription";
import { m } from "@/shared/i18n";
import { notifyWriteFailed } from "@/shared/ui/notify";

/**
 * The one confirm for deleting a category — the sheet's trash button and the
 * list's swipe both go through it.
 *
 * Deleting never removes a subscription: `subscriptions.category_id` is
 * `onDelete: "set null"`. So the confirm warns with the number that lands in
 * Uncategorized instead of blocking on a non-empty category — which is the part
 * that must not drift between two call sites.
 */
export function useDeleteCategoryConfirm() {
  const { data: subscriptions } = useQuery(subscriptionsQuery());
  const remove = useDeleteCategory();

  return useCallback(
    (
      category: { id: string; name: string },
      /** Runs only once the user has actually confirmed. */
      onConfirmed?: () => void,
    ) => {
      const affected = (subscriptions ?? []).filter(
        (item) => item.category?.id === category.id,
      ).length;

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
              onConfirmed?.();
            },
          },
        ],
      );
    },
    [subscriptions, remove],
  );
}
