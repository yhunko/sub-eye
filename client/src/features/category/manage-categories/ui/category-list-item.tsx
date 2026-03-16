import type { FC } from "react";
import type { CategoryDto } from "shared";
import { Button } from "@/shared/components/ui/button";
import NiceModal from "@ebay/nice-modal-react";
import { Pencil, Trash2 } from "lucide-react";
import * as m from "@/i18n/messages";

type CategoryListItemProps = {
  category: CategoryDto;
};

export const CategoryListItem: FC<CategoryListItemProps> = ({ category }) => {
  const handleEdit = async () => {
    const { EditCategoryDialog } = await import("./edit-category-dialog");
    void NiceModal.show(EditCategoryDialog, { category });
  };

  const handleDelete = async () => {
    const { DeleteCategoryConfirmDialog } =
      await import("./delete-category-confirm-dialog");
    void NiceModal.show(DeleteCategoryConfirmDialog, { category });
  };

  return (
    <div className="bg-card flex items-center gap-3 rounded-xl border p-3 shadow-sm">
      <span className="text-xl">{category.emoji}</span>
      <span className="flex-1 font-medium">{category.name}</span>
      <div className="flex gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={m.categories_action_edit()}
          onClick={() => void handleEdit()}
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive size-8"
          aria-label={m.categories_action_delete()}
          onClick={() => void handleDelete()}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
};
