import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { categoriesQuery, useCreateCategory } from "@/entities/category";
import { isAtLimit, planUsageQuery } from "@/entities/billing";
import { Spinner } from "@/shared/components";
import { CategoryListItem } from "./ui/category-list-item";
import { CategoryLimitAlert } from "./ui/category-limit-alert";
import { CategoryForm } from "./ui/category-form";
import type { CreateCategoryInput } from "shared";
import * as m from "@/i18n/messages";
import { toast } from "sonner";

type ManageCategoriesListProps = {
  showForm: boolean;
  onFormClose: () => void;
};

export const ManageCategoriesList = ({
  showForm,
  onFormClose,
}: ManageCategoriesListProps) => {
  const { userId } = useAuth();

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
        <p className="text-muted-foreground text-sm">
          {m.categories_empty_description()}
        </p>
      )}

      <div className="space-y-2">
        {categories.map((category) => (
          <CategoryListItem key={category.id} category={category} />
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
