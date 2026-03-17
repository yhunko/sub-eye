import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { useCallback } from "react";
import type { DeleteCategoriesResponse } from "shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { useDeleteCategories } from "@/entities/category";
import * as m from "@/i18n/messages";
import { toast } from "sonner";

interface DeleteCategoriesConfirmDialogProps {
  categoryIds: string[];
  onSuccess?: (result: DeleteCategoriesResponse) => Promise<void> | void;
}

export const DeleteCategoriesConfirmDialog =
  NiceModal.create<DeleteCategoriesConfirmDialogProps>(
    ({ categoryIds, onSuccess }) => {
      const modal = useModal();
      const { mutate: deleteCategories, isPending } = useDeleteCategories();
      const selectedCount = categoryIds.length;

      const closeModal = useCallback(async () => {
        await modal.hide();
        modal.remove();
      }, [modal]);

      const handleDelete = () => {
        deleteCategories(
          { ids: categoryIds },
          {
            onSuccess: async (result) => {
              await onSuccess?.(result);
              toast.success(
                m.categories_bulk_delete_success({
                  count: result.deletedCount,
                }),
              );
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
            if (!open) void closeModal();
          }}
        >
          <DialogContent onInteractOutside={(event) => event.preventDefault()}>
            <DialogHeader>
              <DialogTitle>
                {m.categories_bulk_delete_confirm_title({
                  count: selectedCount,
                })}
              </DialogTitle>
              <DialogDescription>
                {m.categories_bulk_delete_confirm_description({
                  count: selectedCount,
                })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => void closeModal()}
              >
                {m.common_actions_cancel()}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={handleDelete}
              >
                {m.categories_action_delete_selected()}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    },
  );
