import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import NiceModal from "@ebay/nice-modal-react";
import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { categoriesQuery, useCreateCategory } from "@/entities/category";
import { isAtLimit, planUsageQuery } from "@/entities/billing";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Spinner,
} from "@/shared/components";
import { Button } from "@/shared/components/ui/button";
import { CategoryListItem } from "./ui/category-list-item";
import { CategoryLimitAlert } from "./ui/category-limit-alert";
import { CategorySelectionToolbar } from "./ui/category-selection-toolbar";
import { CategoryForm } from "./ui/category-form";
import type { CreateCategoryInput } from "shared";
import * as m from "@/i18n/messages";
import { toast } from "sonner";
import {
  clearCategorySelection,
  pruneCategorySelection,
  selectAllCategoryIds,
  shouldShowBulkDeleteToolbar,
  toggleCategorySelection,
} from "./model/selection";

type ManageCategoriesListProps = {
  from?: string;
  showForm: boolean;
  onFormOpen: () => void;
  onFormClose: () => void;
};

export const ManageCategoriesList = ({
  from,
  showForm,
  onFormOpen,
  onFormClose,
}: ManageCategoriesListProps) => {
  const { userId } = useAuth();
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(
    () => clearCategorySelection(),
  );

  const { data: categories = [], isLoading } = useQuery(
    categoriesQuery({
      params: { userId: userId ?? "" },
      options: { enabled: !!userId },
    }),
  );

  const { data: usage } = useQuery(
    planUsageQuery({
      params: { userId: userId ?? "" },
      options: { enabled: !!userId },
    }),
  );

  const atLimit = isAtLimit(usage?.categories);
  const categoryIds = useMemo(
    () => categories.map((category) => category.id),
    [categories],
  );
  const selectedCount = selectedCategoryIds.size;
  const showBulkToolbar = shouldShowBulkDeleteToolbar(selectedCount);

  const { mutate: createCategory, isPending: isCreating } = useCreateCategory({
    source: "settings",
  });

  const handleCreate = (data: CreateCategoryInput) => {
    createCategory(data, {
      onSuccess: () => {
        toast.success(m.messages_added());
        onFormClose();
      },
      onError: () => {
        toast.error(m.messages_error());
      },
    });
  };

  useEffect(() => {
    setSelectedCategoryIds((previousSelection) => {
      const nextSelection = pruneCategorySelection(
        previousSelection,
        categoryIds,
      );
      if (
        nextSelection.size === previousSelection.size &&
        Array.from(nextSelection).every((id) => previousSelection.has(id))
      ) {
        return previousSelection;
      }

      return nextSelection;
    });
  }, [categoryIds]);

  const handleCategorySelectionChange = useCallback(
    (categoryId: string, checked: boolean) => {
      setSelectedCategoryIds((previousSelection) => {
        const isSelected = previousSelection.has(categoryId);
        if ((checked && isSelected) || (!checked && !isSelected)) {
          return previousSelection;
        }

        return toggleCategorySelection(previousSelection, categoryId);
      });
    },
    [],
  );

  const handleSelectAll = useCallback(() => {
    setSelectedCategoryIds(selectAllCategoryIds(categoryIds));
  }, [categoryIds]);

  const handleClearSelection = useCallback(() => {
    setSelectedCategoryIds(clearCategorySelection());
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedCategoryIds.size < 2) {
      return;
    }

    const { DeleteCategoriesConfirmDialog } =
      await import("./ui/delete-categories-confirm-dialog");

    void NiceModal.show(DeleteCategoriesConfirmDialog, {
      categoryIds: Array.from(selectedCategoryIds),
      onSuccess: () => {
        handleClearSelection();
      },
    });
  }, [handleClearSelection, selectedCategoryIds]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {usage?.categories && atLimit && (
        <CategoryLimitAlert
          current={usage.categories.current}
          limit={usage.categories.limit!}
        />
      )}

      {categories.length === 0 && !showForm && (
        <Empty className="bg-muted/20 gap-5 border-dashed py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="bg-cyan-500/10 text-cyan-500">
              <Sparkles className="size-6" />
            </EmptyMedia>
            <EmptyTitle>{m.categories_empty_title()}</EmptyTitle>
            <EmptyDescription>
              {m.categories_empty_ai_recommendation()}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <Button asChild className="flex-1">
                <Link to="/settings/categories/generate" search={{ from }}>
                  {m.categories_ai_generate_action()}
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onFormOpen}
              >
                {m.categories_action_add()}
              </Button>
            </div>
          </EmptyContent>
        </Empty>
      )}

      <CategorySelectionToolbar
        categoriesCount={categories.length}
        selectedCount={selectedCount}
        showBulkToolbar={showBulkToolbar}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onDeleteSelected={handleDeleteSelected}
      />

      <div className="space-y-2">
        {categories.map((category) => (
          <CategoryListItem
            key={category.id}
            category={category}
            selected={selectedCategoryIds.has(category.id)}
            onSelectedChange={(checked) =>
              handleCategorySelectionChange(category.id, checked)
            }
          />
        ))}
      </div>

      {showForm && (
        <CategoryForm
          onSubmit={handleCreate}
          isPending={isCreating}
          submitLabel={m.categories_action_add()}
        />
      )}
    </div>
  );
};
