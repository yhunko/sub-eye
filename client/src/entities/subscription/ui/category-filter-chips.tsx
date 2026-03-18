import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { categoriesQuery } from "@/entities/category";
import { cn } from "@/shared/lib/classes-utils";
import * as m from "@/i18n/messages";
import { track } from "@/shared/lib/analytics";

type CategoryFilterChipsProps = {
  // "" means "no filter applied" (All); a UUID means a specific category is active.
  value: string;
  onChange: (categoryId: string) => void;
};

export const CategoryFilterChips = ({
  value,
  onChange,
}: CategoryFilterChipsProps) => {
  const { userId } = useAuth();
  const { data: categories = [] } = useQuery(
    categoriesQuery({
      params: { userId: userId ?? "" },
      options: { enabled: !!userId },
    }),
  );

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
