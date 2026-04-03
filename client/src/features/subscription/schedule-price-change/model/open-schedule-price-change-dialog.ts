import NiceModal from "@ebay/nice-modal-react";
import type { SubscriptionDto } from "shared";

type OpenSchedulePriceChangeDialogParams = {
  subscriptionId: string;
  subscriptionName: string;
  currentCost: number;
  currentCurrency: string;
  nextPaymentDate: string;
  scheduledPriceChange: SubscriptionDto["scheduledPriceChange"];
};

export const openSchedulePriceChangeDialog = async (
  params: OpenSchedulePriceChangeDialogParams,
) => {
  const { SubscriptionSchedulePriceChangeDialog } = await import(
    "../ui/subscription-schedule-price-change-dialog"
  );

  await NiceModal.show(SubscriptionSchedulePriceChangeDialog, params);
};
