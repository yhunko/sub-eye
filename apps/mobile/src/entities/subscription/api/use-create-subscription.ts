import type { SubscriptionDto, SubscriptionPeriod } from "@subeye/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { dashboardKeys } from "@/entities/dashboard";
import { apiClient, assertOk } from "@/shared/api";
import { notifyWriteFailed } from "@/shared/ui/notify";
import { subscriptionKeys } from "./list";

export type CreateSubscriptionVars = {
  name: string;
  cost: number;
  currency: string;
  every: number;
  period: SubscriptionPeriod;
  paymentDate: string;
  categoryId: string | null;
  /** The optional starting offer: begin on a free trial or an intro discount. */
  intro: { kind: "trial" | "intro"; promoCost: number; endsAt: string } | null;
};

/**
 * The one non-optimistic write in the app.
 *
 * There is no id to patch into the cache until the server assigns one, and
 * inventing a temporary row that then has to be swapped out buys nothing on a
 * sheet that dismisses immediately. The list invalidation is what makes the new
 * subscription appear.
 */
export function useCreateSubscription() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (
      vars: CreateSubscriptionVars,
    ): Promise<SubscriptionDto> => {
      const response = await apiClient.api.subscriptions.$post({ json: vars });
      assertOk(response);
      return response.json();
    },
    onError: notifyWriteFailed,
    onSuccess: (created) => {
      // Seed the detail entry so opening the new subscription is instant.
      client.setQueryData(subscriptionKeys.detail(created.id), created);
    },
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({
          queryKey: subscriptionKeys.list(),
          refetchType: "active",
        }),
        client.invalidateQueries({
          queryKey: dashboardKeys.all,
          refetchType: "active",
        }),
      ]),
  });
}
