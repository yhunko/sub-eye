import type { CategoryDto, UpdateCategoryInput } from "@subeye/model";
import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { dashboardKeys } from "@/entities/dashboard";
import { subscriptionKeys } from "@/entities/subscription";
import { apiClient, assertOk } from "@/shared/api";
import { pickCategoryEmoji } from "../model/pick-emoji";

export const categoryKeys = {
  all: () => ["categories"] as const,
};

/**
 * Every category the user owns. A handful of rows that change roughly never, so
 * this is cached long and read by the form picker without a spinner.
 */
export function categoriesQuery() {
  return queryOptions({
    queryKey: categoryKeys.all(),
    queryFn: async (): Promise<CategoryDto[]> => {
      const response = await apiClient.api.categories.$get();
      assertOk(response);
      return response.json();
    },
    staleTime: 60 * 60 * 1000,
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
    mutationFn: async ({
      name,
      emoji,
    }: {
      name: string;
      emoji?: string;
    }): Promise<CategoryDto> => {
      const response = await apiClient.api.categories.$post({
        json: { name: name.trim(), emoji: emoji ?? pickCategoryEmoji(name) },
      });
      assertOk(response);
      return response.json();
    },
    onSuccess: (created) => {
      client.setQueryData<CategoryDto[]>(categoryKeys.all(), (current) =>
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
    mutationFn: async ({
      id,
      changes,
    }: {
      id: string;
      changes: UpdateCategoryInput;
    }): Promise<CategoryDto> => {
      const response = await apiClient.api.categories[":id"].$patch({
        param: { id },
        json: changes,
      });
      assertOk(response);
      return response.json();
    },
    onSuccess: (updated) => {
      client.setQueryData<CategoryDto[]>(categoryKeys.all(), (current) =>
        current?.map((row) => (row.id === updated.id ? updated : row)),
      );
      void client.invalidateQueries({ queryKey: dashboardKeys.all });
      void client.invalidateQueries({ queryKey: subscriptionKeys.all() });
    },
  });
}

/**
 * Delete a category. `subscriptions.category_id` is `onDelete: "set null"`, so
 * this never removes a subscription — it uncategorises however many were in it,
 * which is why both other caches have to go.
 */
export function useDeleteCategory() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await apiClient.api.categories[":id"].$delete({
        param: { id },
      });
      // 204, so there is no body to read — assertOk is still what turns a
      // non-2xx into an ApiError instead of a silent success.
      assertOk(response);
    },
    onSuccess: (_result, id) => {
      client.setQueryData<CategoryDto[]>(categoryKeys.all(), (current) =>
        current?.filter((row) => row.id !== id),
      );
      void client.invalidateQueries({ queryKey: dashboardKeys.all });
      void client.invalidateQueries({ queryKey: subscriptionKeys.all() });
    },
  });
}
