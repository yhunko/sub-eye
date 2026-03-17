import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/shared/api/client";
import { assertOk } from "@/shared/api/api-error";
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
      assertOk(res);
      return res.json();
    },
    ...options,
    enabled: options?.enabled ?? Boolean(userId),
  });
};
