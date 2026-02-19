import type { QueryClient } from "@tanstack/react-query";
import { analyticsQueryKeys } from "@/entities/analytics";
import { subscriptionsQueryKeys } from "../model/query-keys";

type HandleSubscriptionMutationSuccessParams = {
  queryClient: QueryClient;
  subscriptionId: string;
  userId: string | null | undefined;
};

export const handleSubscriptionMutationSuccess = async ({
  queryClient,
  subscriptionId,
  userId,
}: HandleSubscriptionMutationSuccessParams) => {
  if (userId) {
    await queryClient.invalidateQueries({
      queryKey: subscriptionsQueryKeys.detail({ userId, subscriptionId })
        .queryKey,
      refetchType: "active",
    });
  }

  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: subscriptionsQueryKeys.list._def,
      refetchType: "active",
    }),
    queryClient.invalidateQueries({
      queryKey: analyticsQueryKeys._def,
      refetchType: "active",
    }),
  ]);
};
