import { useId, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/shared/components";
import { categoriesQuery, useCreateCategory } from "@/entities/category";
import { isAtLimit, planUsageQuery } from "@/entities/billing";
import { Check, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/shared/lib/classes-utils";
import * as m from "@/i18n/messages";
import { toast } from "sonner";
import { DEFAULT_CATEGORY_EMOJI, type CategoryDto } from "shared";

type CategorySelectorProps = {
  value: string | null | undefined;
  onChange: (categoryId: string | null) => void;
};

export const CategorySelector = ({
  value,
  onChange,
}: CategorySelectorProps) => {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const newCategoryInputRef = useRef<HTMLInputElement>(null);
  const { userId } = useAuth();

  const { data: categories = [] } = useQuery(
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
    source: "subscription_form",
  });

  const selected = categories.find((c) => c.id === value);

  const handleSelect = (category: CategoryDto) => {
    onChange(category.id === value ? null : category.id);
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setOpen(false);
  };

  const handleCreateNew = () => {
    if (!newName.trim()) return;
    createCategory(
      { name: newName.trim(), emoji: DEFAULT_CATEGORY_EMOJI },
      {
        onSuccess: (created) => {
          onChange(created.id);
          setShowCreate(false);
          setNewName("");
          setOpen(false);
          toast.success(m.messages_added());
        },
        onError: () => {
          toast.error(m.messages_error());
        },
      },
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span>
              {selected.emoji} {selected.name}
            </span>
          ) : (
            <span className="text-muted-foreground">
              {m.form_basicInfo_category_label()}
            </span>
          )}
          <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-0"
        align="start"
        onOpenAutoFocus={(event) => {
          if (!showCreate) {
            return;
          }

          event.preventDefault();
          newCategoryInputRef.current?.focus();
        }}
      >
        <Command>
          <CommandInput placeholder={m.common_placeholders_search()} />
          <CommandList id={listboxId}>
            <CommandEmpty>{m.common_noResults()}</CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem onSelect={handleClear}>
                  <span className="text-muted-foreground">
                    {m.categories_filter_all()}
                  </span>
                </CommandItem>
              )}
              {categories.map((category) => (
                <CommandItem
                  key={category.id}
                  value={`${category.emoji} ${category.name}`}
                  onSelect={() => handleSelect(category)}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      value === category.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {category.emoji} {category.name}
                </CommandItem>
              ))}
            </CommandGroup>
            {!atLimit && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  {showCreate ? (
                    <div className="flex gap-1 p-1">
                      <input
                        ref={newCategoryInputRef}
                        className="flex-1 rounded border px-2 py-1 text-sm outline-none"
                        placeholder={m.categories_form_name_placeholder()}
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleCreateNew();
                          }
                          if (e.key === "Escape") setShowCreate(false);
                        }}
                        disabled={isCreating}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateNew}
                        disabled={isCreating || !newName.trim()}
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                  ) : (
                    <CommandItem onSelect={() => setShowCreate(true)}>
                      <Plus className="mr-2 size-4" />
                      {m.categories_action_add()}
                    </CommandItem>
                  )}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
