import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import type { CategoryDto, UpdateCategoryInput } from "shared";
import { useUpdateCategory } from "@/entities/category";
import { CategoryForm } from "./category-form";
import * as m from "@/i18n/messages";
import { toast } from "sonner";

interface EditCategoryDialogProps {
  category: CategoryDto;
}

export const EditCategoryDialog = NiceModal.create<EditCategoryDialogProps>(
  ({ category }) => {
    const modal = useModal();
    const { mutate: updateCategory, isPending } = useUpdateCategory();

    const closeModal = useCallback(async () => {
      await modal.hide();
      modal.remove();
    }, [modal]);

    const handleSubmit = (data: UpdateCategoryInput) => {
      updateCategory(
        { id: category.id, payload: data },
        {
          onSuccess: async () => {
            toast.success(m.messages_updated());
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{m.categories_action_edit()}</DialogTitle>
          </DialogHeader>
          <CategoryForm
            defaultValues={{ name: category.name, emoji: category.emoji }}
            onSubmit={handleSubmit}
            isPending={isPending}
            submitLabel={m.categories_action_edit()}
          />
        </DialogContent>
      </Dialog>
    );
  },
);
