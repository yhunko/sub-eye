import { UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";

type QueryHookOptions<Data, Select = Data> = Omit<
  UseQueryOptions<Data, Error, Select>,
  "queryKey" | "queryFn"
>;

export type QueryHook<
  Data,
  Parameters = null,
  Select = Data,
> = Parameters extends null
  ? { options?: QueryHookOptions<Data, Select> }
  : { params: Parameters; options?: QueryHookOptions<Data, Select> };

export type MutationHook<TData, TParameters, TContext = never> = {
  options?: Omit<
    UseMutationOptions<TData, Error, TParameters, TContext>,
    "mutationKey" | "mutationFn" | "onSuccess"
  >;
  hideToast?: boolean;
};
