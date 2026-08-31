import type { UpdateCategoryInput } from "@subeye/model";
import {
  type CategoryRecord,
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "@subeye/store";
import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { dashboardKeys } from "@/entities/dashboard";
import { subscriptionKeys } from "@/entities/subscription";
import { localPorts } from "@/shared/lib/store";
import { pickCategoryEmoji } from "../model/pick-emoji";

export const categoryKeys = {
  all: () => ["categories"] as const,
};

/** Every category. A handful of rows that change roughly never. */
export function categoriesQuery() {
  return queryOptions({
    queryKey: categoryKeys.all(),
    queryFn: (): Promise<CategoryRecord[]> => listCategories(localPorts),
  });
}

/**
 * Creates a category. `emoji` is optional — omitted, it is derived from the
 * name (see `pickCategoryEmoji`), which is what the in-form create path wants.
 * The dashboard is invalidated because the category breakdown is computed from
 * this list joined to the subscriptions.
 */
export function useCreateCategory() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({
      name,
      emoji,
    }: {
      name: string;
      emoji?: string;
    }): Promise<CategoryRecord> =>
      createCategory(localPorts, {
        name: name.trim(),
        emoji: emoji ?? pickCategoryEmoji(name),
      }),
    onSuccess: (created) => {
      client.setQueryData<CategoryRecord[]>(categoryKeys.all(), (current) =>
        current ? [...current, created] : [created],
      );
      void client.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

/**
 * Rename a category or change its emoji.
 *
 * The subscription list carries a denormalised `category` on every row, so a
 * rename that only patched the categories cache would leave the old name on
 * every row until something else invalidated it.
 */
export function useUpdateCategory() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      changes,
    }: {
      id: string;
      changes: UpdateCategoryInput;
    }): Promise<CategoryRecord> => updateCategory(localPorts, id, changes),
    onSuccess: (updated) => {
      client.setQueryData<CategoryRecord[]>(categoryKeys.all(), (current) =>
        current?.map((row) => (row.id === updated.id ? updated : row)),
      );
      void client.invalidateQueries({ queryKey: dashboardKeys.all });
      void client.invalidateQueries({ queryKey: subscriptionKeys.all() });
    },
  });
}

/**
 * Delete a category. The store nulls `categoryId` on the subscriptions that
 * referenced it rather than removing them, so this never deletes a
 * subscription — it uncategorises however many were in it, which is why both
 * other caches have to go.
 */
export function useDeleteCategory() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: string): Promise<void> => deleteCategory(localPorts, id),
    onSuccess: (_result, id) => {
      client.setQueryData<CategoryRecord[]>(categoryKeys.all(), (current) =>
        current?.filter((row) => row.id !== id),
      );
      void client.invalidateQueries({ queryKey: dashboardKeys.all });
      void client.invalidateQueries({ queryKey: subscriptionKeys.all() });
    },
  });
}
