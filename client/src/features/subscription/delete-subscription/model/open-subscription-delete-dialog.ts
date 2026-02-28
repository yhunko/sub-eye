import NiceModal from "@ebay/nice-modal-react";

type OpenSubscriptionDeleteDialogParams = {
  subscriptionId: string;
  subscriptionName?: string;
  onSuccess?: () => Promise<void> | void;
};

export const openSubscriptionDeleteDialog = async ({
  subscriptionId,
  subscriptionName,
  onSuccess,
}: OpenSubscriptionDeleteDialogParams) => {
  const { SubscriptionDeleteDialog } =
    await import("../ui/subscription-delete-dialog");

  await NiceModal.show(SubscriptionDeleteDialog, {
    subscriptionId,
    subscriptionName,
    onSuccess,
  });
};
