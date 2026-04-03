import type { FC } from "react";
import type { CategoryDto } from "shared";
import * as m from "@/i18n/messages";
import { track } from "@/shared/lib/analytics";
import { cn } from "@/shared/lib/classes-utils";

type CategoryFilterChipsProps = {
  categories: CategoryDto[];
  value: string;
  onChange: (categoryId: string) => void;
};

export const CategoryFilterChips: FC<CategoryFilterChipsProps> = ({
  categories,
  value,
  onChange,
}) => {
  if (categories.length === 0) return null;

  const handleChipClick = (categoryId: string) => {
    if (categoryId !== "") {
      track("category_filter_used");
    }
    onChange(categoryId === value ? "" : categoryId);
  };

  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
      <button
        type="button"
        onClick={() => handleChipClick("")}
        className={cn(
          "inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-sm transition-colors",
          value === ""
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background hover:bg-muted",
        )}
      >
        {m.categories_filter_all()}
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => handleChipClick(category.id)}
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors",
            value === category.id
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background hover:bg-muted",
          )}
        >
          <span>{category.emoji}</span>
          <span>{category.name}</span>
        </button>
      ))}
    </div>
  );
};
