import NiceModal, { useModal } from "@ebay/nice-modal-react";
import type { CategoryDto } from "@subeye/shared";
import { useCallback } from "react";
import { toast } from "sonner";
import { useDeleteCategory } from "@/entities/category";
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

interface DeleteCategoryConfirmDialogProps {
  category: CategoryDto;
}

export const DeleteCategoryConfirmDialog =
  NiceModal.create<DeleteCategoryConfirmDialogProps>(({ category }) => {
    const modal = useModal();
    const { mutate: deleteCategory, isPending } = useDeleteCategory();

    const closeModal = useCallback(async () => {
      await modal.hide();
      modal.remove();
    }, [modal]);

    const handleDelete = () => {
      deleteCategory(category.id, {
        onSuccess: async () => {
          toast.success(m.messages_deleted());
          await closeModal();
        },
        onError: () => {
          toast.error(m.messages_error());
        },
      });
    };

    return (
      <Dialog
        open={modal.visible}
        onOpenChange={(open) => {
          if (!open) void closeModal();
        }}
      >
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{m.categories_delete_confirm_title()}</DialogTitle>
            <DialogDescription>
              {m.categories_delete_confirm_description()}
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
              {m.categories_action_delete()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  });
