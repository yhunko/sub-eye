import NiceModal from "@ebay/nice-modal-react";

export const openTelegramDisconnectDialog = async () => {
  const { TelegramDisconnectDialog } =
    await import("../ui/telegram-disconnect-dialog");

  return NiceModal.show(TelegramDisconnectDialog) as Promise<boolean>;
};
