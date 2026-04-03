import { queryOptions } from "@tanstack/react-query";
import type { CategoryDto } from "shared";
import { assertOk } from "@/shared/api/api-error";
import { apiClient } from "@/shared/api/client";
import type { QueryHook } from "@/shared/lib/react-query/types";
import { categoriesQueryKeys } from "../model/query-keys";

export type CategoriesParams = { userId: string; orgId?: string | null };

export const categoriesQuery = ({
  params,
  options,
}: QueryHook<CategoryDto[], CategoriesParams>) => {
  const { userId, orgId } = params;

  return queryOptions({
    queryKey: categoriesQueryKeys.list({ userId, orgId }).queryKey,
    queryFn: async () => {
      const res = await apiClient.api.categories.$get();
      assertOk(res);
      return res.json();
    },
    ...options,
    enabled: options?.enabled ?? Boolean(userId),
  });
};
