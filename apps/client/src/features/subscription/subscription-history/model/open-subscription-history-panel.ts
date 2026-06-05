import NiceModal from "@ebay/nice-modal-react";

type OpenSubscriptionHistoryPanelParams = {
  subscriptionId: string;
};

export const openSubscriptionHistoryPanel = async ({
  subscriptionId,
}: OpenSubscriptionHistoryPanelParams) => {
  const { SubscriptionHistoryPanel } = await import(
    "../ui/subscription-history-panel"
  );

  await NiceModal.show(SubscriptionHistoryPanel, {
    subscriptionId,
  });
};
