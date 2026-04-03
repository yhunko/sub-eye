import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { useCallback } from "react";
import type {
  CategoryDto,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "shared";
import { toast } from "sonner";
import { useCreateCategory, useUpdateCategory } from "@/entities/category";
import * as m from "@/i18n/messages";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { CategoryForm } from "./category-form";

interface EditCategoryDialogProps {
  category?: CategoryDto;
}

export const EditCategoryDialog = NiceModal.create<EditCategoryDialogProps>(
  ({ category }) => {
    const modal = useModal();
    const { mutate: updateCategory, isPending } = useUpdateCategory();
    const { mutate: createCategory, isPending: isCreating } = useCreateCategory(
      {
        source: "settings",
      },
    );
    const isEditMode = !!category;
    const isSubmitting = isEditMode ? isPending : isCreating;

    const closeModal = useCallback(async () => {
      await modal.hide();
      modal.remove();
    }, [modal]);

    const handleSubmit = (data: CreateCategoryInput) => {
      if (!category) {
        createCategory(data, {
          onSuccess: async () => {
            toast.success(m.messages_added());
            await closeModal();
          },
          onError: () => {
            toast.error(m.messages_error());
          },
        });
        return;
      }

      updateCategory(
        { id: category.id, payload: data as UpdateCategoryInput },
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
            <DialogTitle>
              {isEditMode
                ? m.categories_action_edit()
                : m.categories_action_add()}
            </DialogTitle>
          </DialogHeader>
          <CategoryForm
            defaultValues={
              category
                ? { name: category.name, emoji: category.emoji }
                : undefined
            }
            onSubmit={handleSubmit}
            isPending={isSubmitting}
            submitLabel={
              isEditMode
                ? m.categories_action_edit()
                : m.categories_action_add()
            }
          />
        </DialogContent>
      </Dialog>
    );
  },
);
