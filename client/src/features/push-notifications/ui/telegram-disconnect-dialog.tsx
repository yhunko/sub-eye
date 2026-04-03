import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { useCallback } from "react";
import * as m from "@/i18n/messages";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

export const TelegramDisconnectDialog = NiceModal.create(() => {
  const modal = useModal();

  const closeModal = useCallback(async () => {
    await modal.hide();
    modal.remove();
  }, [modal]);

  const handleCancel = useCallback(async () => {
    modal.resolve(false);
    await closeModal();
  }, [closeModal, modal]);

  const handleConfirm = useCallback(async () => {
    modal.resolve(true);
    await closeModal();
  }, [closeModal, modal]);

  return (
    <Dialog
      open={modal.visible}
      onOpenChange={(open) => {
        if (!open) {
          void handleCancel();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {m.settings_notifications_telegram_disconnect_title()}
          </DialogTitle>
          <DialogDescription>
            {m.settings_notifications_telegram_disconnect_description()}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleCancel()}
          >
            {m.common_actions_cancel()}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleConfirm()}
          >
            {m.settings_notifications_telegram_disconnect()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
