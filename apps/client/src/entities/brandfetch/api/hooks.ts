import { useQuery } from "@tanstack/react-query";
import type { QueryHook } from "@/shared/lib/react-query/types";
import type { BrandfetchSearchDto } from "../model/dtos";
import type { BrandfetchSearchParams } from "../model/params";
import { brandfetchQueryKeys } from "../model/query-keys";
import { BrandfetchRepository } from "../repository/brandfetch.repository";

const brandfetchRepository = new BrandfetchRepository();

export const useBrandfetchSearch = ({
  params,
  options,
}: QueryHook<BrandfetchSearchDto[], BrandfetchSearchParams>) => {
  return useQuery({
    queryKey: brandfetchQueryKeys.search(params).queryKey,
    queryFn: async () => {
      return brandfetchRepository.searchBrands(params);
    },
    ...options,
  });
};
