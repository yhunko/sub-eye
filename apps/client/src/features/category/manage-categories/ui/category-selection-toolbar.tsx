import { CheckCheck, Trash2, X } from "lucide-react";
import * as m from "@/i18n/messages";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";

type CategorySelectionToolbarProps = {
  categoriesCount: number;
  selectedCount: number;
  showBulkToolbar: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
};

export const CategorySelectionToolbar = ({
  categoriesCount,
  selectedCount,
  showBulkToolbar,
  onSelectAll,
  onClearSelection,
  onDeleteSelected,
}: CategorySelectionToolbarProps) => {
  if (categoriesCount === 0) return null;

  const allSelected = selectedCount === categoriesCount;

  return (
    <div className="sticky top-[calc(env(safe-area-inset-top)+4.25rem)] z-30">
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/85 rounded-xl border px-2.5 py-2 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <Badge variant="secondary" className="shrink-0">
            {m.categories_selection_selected_count({ count: selectedCount })}
          </Badge>

          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-1 sm:flex-nowrap sm:justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 min-w-0 flex-1 gap-1 px-1.5 text-[11px] sm:flex-none sm:text-xs"
              onClick={onSelectAll}
              disabled={allSelected}
              aria-label={m.categories_selection_select_all()}
            >
              <CheckCheck className="size-3.5 shrink-0" />
              <span className="truncate">{m.categories_filter_all()}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 min-w-0 flex-1 gap-1 px-1.5 text-[11px] sm:flex-none sm:text-xs"
              onClick={onClearSelection}
              disabled={selectedCount === 0}
              aria-label={m.categories_selection_clear()}
            >
              <X className="size-3.5 shrink-0" />
              <span className="truncate">{m.common_actions_clear()}</span>
            </Button>
            {showBulkToolbar && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-7 w-full min-w-0 gap-1 px-1.5 text-[11px] sm:w-auto sm:text-xs"
                onClick={onDeleteSelected}
                aria-label={m.categories_action_delete_selected()}
              >
                <Trash2 className="size-3.5 shrink-0" />
                <span className="truncate">{m.categories_action_delete()}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
