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
  const invalidations = [
    queryClient.invalidateQueries({
      queryKey: subscriptionsQueryKeys.list._def,
      refetchType: "active",
    }),
    queryClient.invalidateQueries({
      queryKey: analyticsQueryKeys._def,
      refetchType: "active",
    }),
  ];

  if (userId) {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: subscriptionsQueryKeys.detail({ userId, subscriptionId })
          .queryKey,
        refetchType: "active",
      }),
      queryClient.invalidateQueries({
        queryKey: subscriptionsQueryKeys.history({ userId, subscriptionId })
          .queryKey,
        refetchType: "active",
      }),
    );
  } else {
    invalidations.push(
      queryClient.invalidateQueries({
        queryKey: subscriptionsQueryKeys.history._def,
        refetchType: "active",
      }),
    );
  }

  await Promise.all(invalidations);
};
