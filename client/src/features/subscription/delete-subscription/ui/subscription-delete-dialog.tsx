import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { useDeleteSubscription } from "@/entities/subscription/api/use-delete-subscription";
import * as m from "@/i18n/messages";
import { toast } from "sonner";

interface SubscriptionDeleteDialogProps {
  subscriptionId: string;
  subscriptionName?: string;
  onSuccess?: () => Promise<void> | void;
}

export const SubscriptionDeleteDialog =
  NiceModal.create<SubscriptionDeleteDialogProps>(
    ({ subscriptionId, subscriptionName, onSuccess }) => {
      const modal = useModal();
      const { mutate: deleteSubscription, isPending } = useDeleteSubscription();

      const closeModal = useCallback(async () => {
        await modal.hide();
        modal.remove();
      }, [modal]);

      const handleDelete = () => {
        deleteSubscription(
          { id: subscriptionId },
          {
            onSuccess: async () => {
              await onSuccess?.();
              toast.success(m.messages_deleted());
              await closeModal();
            },
            onError: () => {
              toast.error(m.messages_error());
            },
          },
        );
      };

      return (
        <Dialog
          open={modal.visible}
          onOpenChange={(open) => {
            if (!open) {
              void closeModal();
            }
          }}
        >
          <DialogContent onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>{m.form_buttons_delete()}</DialogTitle>
              <DialogDescription>
                {m.messages_confirmDelete({
                  name: subscriptionName ?? "this subscription",
                })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  void closeModal();
                }}
              >
                {m.subscription_overview_back()}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                {m.form_buttons_delete()}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    },
  );
