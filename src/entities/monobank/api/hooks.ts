import { createQueryKeys } from "@lukemorales/query-key-factory";
import { QueryHook } from "@/shared/lib/react-query";
import { CurrencyDto } from "../model/dtos";
import { useQuery } from "@tanstack/react-query";
import { getCurrenciesAction } from "./actions";

export const monobankQueryKeys = createQueryKeys("MONOBANK", {
  currencies: null,
});

export const useCurrencies = ({ options }: QueryHook<CurrencyDto[]>) => {
  return useQuery({
    queryKey: monobankQueryKeys.currencies.queryKey,
    queryFn: async () => {
      return getCurrenciesAction();
    },
    staleTime: Number.POSITIVE_INFINITY,
    refetchInterval: false,
    ...options,
  });
};
