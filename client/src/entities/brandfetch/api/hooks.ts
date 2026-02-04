import { BrandfetchSearchParams } from "../model/params";
import { useQuery } from "@tanstack/react-query";
import { BrandfetchSearchDto } from "../model/dtos";
import { BrandfetchRepository } from "../repository/brandfetch.repository";
import { QueryHook } from "@/shared/lib/react-query/types";
import { brandfetchQueryKeys } from "../model/query-keys";

const brandfetchRepository = new BrandfetchRepository();

export const useBrandfetchSearch = ({
  params,
}: QueryHook<BrandfetchSearchDto[], BrandfetchSearchParams>) => {
  return useQuery({
    queryKey: brandfetchQueryKeys.search(params).queryKey,
    queryFn: async () => {
      return brandfetchRepository.searchBrands(params);
    },
  });
};
