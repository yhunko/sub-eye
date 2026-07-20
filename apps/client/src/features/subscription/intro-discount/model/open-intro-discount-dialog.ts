import NiceModal from "@ebay/nice-modal-react";

type OpenIntroDiscountDialogParams = {
  subscriptionId: string;
  subscriptionName: string;
  currentCost: number;
  currentCurrency: string;
};

export const openIntroDiscountDialog = async (
  params: OpenIntroDiscountDialogParams,
) => {
  const { SubscriptionPricingPhaseDialog } = await import(
    "../../shared/ui/subscription-pricing-phase-dialog"
  );

  await NiceModal.show(SubscriptionPricingPhaseDialog, {
    ...params,
    mode: "intro",
  });
};
