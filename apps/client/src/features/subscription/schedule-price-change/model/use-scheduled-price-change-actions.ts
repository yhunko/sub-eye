import type { SubscriptionDto } from "@subeye/shared";
import { useCallback } from "react";
import { toast } from "sonner";
import {
  useApplyScheduledSubscriptionPriceChangeNow,
  useCancelScheduledSubscriptionPriceChange,
} from "@/entities/subscription";
import * as m from "@/i18n/messages";
import { openSchedulePriceChangeDialog } from "./open-schedule-price-change-dialog";

type UseScheduledPriceChangeActionsParams = {
  subscription?: SubscriptionDto;
};

export const useScheduledPriceChangeActions = ({
  subscription,
}: UseScheduledPriceChangeActionsParams) => {
  const { mutate: cancelScheduledPriceChange, isPending: isCancelPending } =
    useCancelScheduledSubscriptionPriceChange();
  const { mutate: applyScheduledPriceChangeNow, isPending: isApplyNowPending } =
    useApplyScheduledSubscriptionPriceChangeNow();

  const openScheduleDialog = useCallback(() => {
    if (!subscription) {
      return;
    }

    void openSchedulePriceChangeDialog({
      subscriptionId: subscription.id,
      subscriptionName: subscription.name,
      currentCost: subscription.cost,
      currentCurrency: subscription.currency,
      nextPaymentDate: subscription.nextPaymentDate,
      scheduledPriceChange: subscription.scheduledPriceChange,
    });
  }, [subscription]);

  const applyScheduledNow = useCallback(() => {
    if (!subscription?.scheduledPriceChange) {
      return;
    }

    applyScheduledPriceChangeNow(
      { id: subscription.id },
      {
        onSuccess: () => {
          toast.success(m.messages_updated());
        },
        onError: () => {
          toast.error(m.messages_error());
        },
      },
    );
  }, [applyScheduledPriceChangeNow, subscription]);

  const cancelScheduled = useCallback(() => {
    if (!subscription?.scheduledPriceChange) {
      return;
    }

    cancelScheduledPriceChange(
      { id: subscription.id },
      {
        onSuccess: () => {
          toast.success(m.messages_updated());
        },
        onError: () => {
          toast.error(m.messages_error());
        },
      },
    );
  }, [cancelScheduledPriceChange, subscription]);

  return {
    openScheduleDialog,
    applyScheduledNow,
    cancelScheduled,
    isApplyNowPending,
    isCancelPending,
  };
};
