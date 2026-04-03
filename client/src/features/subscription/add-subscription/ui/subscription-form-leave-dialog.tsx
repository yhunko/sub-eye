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

export const SubscriptionFormLeaveDialog = NiceModal.create(() => {
  const modal = useModal();

  const closeModal = useCallback(async () => {
    await modal.hide();
    modal.remove();
  }, [modal]);

  const handleStay = useCallback(async () => {
    modal.resolve(false);
    await closeModal();
  }, [closeModal, modal]);

  const handleDiscard = useCallback(async () => {
    modal.resolve(true);
    await closeModal();
  }, [closeModal, modal]);

  return (
    <Dialog
      open={modal.visible}
      onOpenChange={(open) => {
        if (!open) {
          void handleStay();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.subscription_form_leave_title()}</DialogTitle>
          <DialogDescription>
            {m.subscription_form_leave_description()}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleStay()}
          >
            {m.common_actions_cancel()}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleDiscard()}
          >
            {m.subscription_form_leave_confirm()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
