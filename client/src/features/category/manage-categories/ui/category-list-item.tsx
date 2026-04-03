import NiceModal from "@ebay/nice-modal-react";
import { Pencil, Trash2 } from "lucide-react";
import type { FC } from "react";
import type { CategoryDto } from "shared";
import * as m from "@/i18n/messages";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { cn } from "@/shared/lib/classes-utils";

type CategoryListItemProps = {
  category: CategoryDto;
  selected: boolean;
  onSelectedChange: (checked: boolean) => void;
};

export const CategoryListItem: FC<CategoryListItemProps> = ({
  category,
  selected,
  onSelectedChange,
}) => {
  const handleEdit = async () => {
    const { EditCategoryDialog } = await import("./edit-category-dialog");
    void NiceModal.show(EditCategoryDialog, { category });
  };

  const handleDelete = async () => {
    const { DeleteCategoryConfirmDialog } = await import(
      "./delete-category-confirm-dialog"
    );
    void NiceModal.show(DeleteCategoryConfirmDialog, { category });
  };

  return (
    <div
      className={cn(
        "bg-card flex items-center gap-3 overflow-hidden rounded-xl border p-2.5 shadow-sm sm:p-3",
        selected && "border-primary/50 bg-primary/5",
      )}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={(checked) => onSelectedChange(checked === true)}
        aria-label={m.categories_selection_toggle_aria({ name: category.name })}
        className="shrink-0"
      />
      <span className="shrink-0 text-xl">{category.emoji}</span>
      <span className="min-w-0 flex-1 truncate font-medium">
        {category.name}
      </span>
      <div className="flex shrink-0 gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label={m.categories_action_edit()}
          onClick={() => void handleEdit()}
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive size-8 shrink-0"
          aria-label={m.categories_action_delete()}
          onClick={() => void handleDelete()}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
};
