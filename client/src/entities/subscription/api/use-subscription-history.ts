import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import type { QueryHook } from "@/shared/lib/react-query/types";
import {
  type SubscriptionHistoryResponse,
  subscriptionHistoryQuery,
} from "./subscription-history-query";

type Params = {
  id: string;
};

export function useSubscriptionHistory({
  params,
  options,
}: QueryHook<SubscriptionHistoryResponse, Params>) {
  const { userId } = useAuth();

  return useQuery(
    subscriptionHistoryQuery({
      params: {
        id: params.id,
        userId: userId ?? "",
      },
      options,
    }),
  );
}
