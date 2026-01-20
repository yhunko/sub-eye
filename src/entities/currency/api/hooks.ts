import { createQueryKeys } from "@lukemorales/query-key-factory";
import { QueryHook } from "@/shared/lib/react-query";
import { useQuery } from "@tanstack/react-query";
import { getRatesAction } from "./actions";

export const currencyQueryKeys = createQueryKeys("CURRENCY", {
  rates: (base: string) => [base],
});

export const useRates = (
  base: string,
  { options }: QueryHook<Record<string, number>> = {},
) => {
  return useQuery({
    queryKey: currencyQueryKeys.rates(base).queryKey,
    queryFn: async () => {
      return getRatesAction(base);
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchInterval: false,
    ...options,
  });
};
