import type { CategoryDto } from "@subeye/shared";
import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { dashboardKeys } from "@/entities/dashboard";
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
 * Creates a category from a name alone — the emoji is derived, see
 * `pickCategoryEmoji`. The dashboard is invalidated because the category
 * breakdown is computed from this list joined to the subscriptions.
 */
export function useCreateCategory() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (name: string): Promise<CategoryDto> => {
      const response = await apiClient.api.categories.$post({
        json: { name: name.trim(), emoji: pickCategoryEmoji(name) },
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
