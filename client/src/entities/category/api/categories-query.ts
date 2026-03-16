import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import type { QueryHook } from "@/shared/lib/react-query/types";
import type { CategoryDto } from "shared";
import { categoriesQueryKeys } from "../model/query-keys";

export type CategoriesParams = { userId: string };

export const categoriesQuery = ({
  params,
  options,
}: QueryHook<CategoryDto[], CategoriesParams>) => {
  const { userId } = params;

  return queryOptions({
    queryKey: categoriesQueryKeys.list({ userId }).queryKey,
    queryFn: async () => {
      const res = await apiClient.api.categories.$get();
      if (!res.ok) {
        throw new Error("Failed to fetch categories");
      }
      return res.json() as Promise<CategoryDto[]>;
    },
    ...options,
    enabled: options?.enabled ?? Boolean(userId),
  });
};
