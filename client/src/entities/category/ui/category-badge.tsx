import type { FC } from "react";
import type { CategoryDto } from "shared";

type CategoryBadgeProps = {
  category: CategoryDto | null | undefined;
};

export const CategoryBadge: FC<CategoryBadgeProps> = ({ category }) => {
  if (!category) return null;

  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span>{category.emoji}</span>
      <span className="text-muted-foreground">{category.name}</span>
    </span>
  );
};
