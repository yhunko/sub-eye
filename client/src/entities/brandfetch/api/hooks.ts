import { createQueryKeys } from "@lukemorales/query-key-factory";
import { BrandfetchSearchParams } from "../model/params";
import { useQuery } from "@tanstack/react-query";
import { BrandfetchSearchDto } from "../model/dtos";
import { BrandfetchRepository } from "../repository/brandfetch.repository";
import { QueryHook } from "@/shared/lib/react-query/types";

const brandfetchRepository = new BrandfetchRepository();

export const brandfetchQueryKeys = createQueryKeys("brandfetch", {
  search: (params: BrandfetchSearchParams) => [params],
});

export const useBrandfetchSearch = ({
  params,
}: QueryHook<BrandfetchSearchDto, BrandfetchSearchParams>) => {
  return useQuery({
    queryKey: brandfetchQueryKeys.search(params).queryKey,
    queryFn: async () => {
      return brandfetchRepository.searchBrands(params);
    },
  });
};
