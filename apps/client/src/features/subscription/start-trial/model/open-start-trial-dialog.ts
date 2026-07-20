import NiceModal from "@ebay/nice-modal-react";

type OpenStartTrialDialogParams = {
  subscriptionId: string;
  subscriptionName: string;
  currentCost: number;
  currentCurrency: string;
};

export const openStartTrialDialog = async (
  params: OpenStartTrialDialogParams,
) => {
  const { SubscriptionPricingPhaseDialog } = await import(
    "../../shared/ui/subscription-pricing-phase-dialog"
  );

  await NiceModal.show(SubscriptionPricingPhaseDialog, {
    ...params,
    mode: "trial",
  });
};
