import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { CreateCategorySchema, type CreateCategoryInput } from "shared";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Button,
  Spinner,
} from "@/shared/components";
import { cn } from "@/shared/lib/classes-utils";
import * as m from "@/i18n/messages";
import { EMOJI_GROUPS } from "../model/emoji-groups";

// Pre-computed flat list for keyboard navigation index mapping.
const FLAT_EMOJIS = EMOJI_GROUPS.flatMap((g) => g.emojis);

// Same structure enriched with a flat index for each emoji.
const GROUPS_WITH_IDX = (() => {
  let idx = 0;
  return EMOJI_GROUPS.map((group) => ({
    label: group.label,
    emojis: (group.emojis as readonly string[]).map((emoji) => ({
      emoji,
      idx: idx++,
    })),
  }));
})();

const COLS = 6;

function EmojiPicker({
  value,
  onChange,
  hasError,
}: {
  value: string;
  onChange: (emoji: string) => void;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Close on click outside.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // When the dropdown opens, focus the currently selected emoji (or first).
  // `value` is intentionally omitted: re-running on value changes while open
  // would reset keyboard navigation focus mid-interaction.
  useEffect(() => {
    if (!open) return;
    const initial = value
      ? (FLAT_EMOJIS as readonly string[]).indexOf(value)
      : 0;
    setFocusedIdx(initial >= 0 ? initial : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Move real DOM focus whenever focusedIdx changes.
  useEffect(() => {
    if (!open || focusedIdx < 0) return;
    const btn = gridRef.current?.querySelector<HTMLButtonElement>(
      `[data-idx="${focusedIdx}"]`,
    );
    btn?.focus({ preventScroll: true });
    btn?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [focusedIdx, open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const total = FLAT_EMOJIS.length;

    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        setFocusedIdx((i) => Math.min(i + 1, total - 1));
        break;
      case "ArrowLeft":
        e.preventDefault();
        setFocusedIdx((i) => Math.max(i - 1, 0));
        break;
      case "ArrowDown":
        e.preventDefault();
        setFocusedIdx((i) => Math.min(i + COLS, total - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIdx((i) => Math.max(i - COLS, 0));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (focusedIdx >= 0) {
          onChange(FLAT_EMOJIS[focusedIdx]);
          setOpen(false);
        }
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-invalid={hasError || undefined}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "border-input bg-background dark:bg-input/30 flex h-9 w-full items-center justify-center rounded-md border shadow-xs transition-colors outline-none",
          "hover:bg-accent focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:border-destructive",
          "text-2xl",
        )}
      >
        {value || (
          <span className="text-muted-foreground text-sm">
            {m.categories_form_emoji_placeholder()}
          </span>
        )}
      </button>

      {open && (
        <div className="bg-popover absolute top-full left-0 z-50 mt-1 w-64 rounded-md border shadow-md">
          <div
            ref={gridRef}
            className="h-72 overflow-y-auto p-2"
            onKeyDown={handleKeyDown}
          >
            {GROUPS_WITH_IDX.map((group) => (
              <div key={group.label} className="mb-1">
                <p className="text-muted-foreground px-0.5 py-0.5 text-xs">
                  {group.label}
                </p>
                <div className="grid grid-cols-6 gap-0.5">
                  {group.emojis.map(({ emoji, idx }) => (
                    <button
                      key={emoji}
                      type="button"
                      data-idx={idx}
                      tabIndex={focusedIdx === idx ? 0 : -1}
                      onFocus={() => setFocusedIdx(idx)}
                      onClick={() => {
                        onChange(emoji);
                        setOpen(false);
                      }}
                      className={cn(
                        "hover:bg-accent flex h-9 w-9 items-center justify-center rounded text-xl transition-colors",
                        "focus:bg-accent focus:outline-none",
                        value === emoji && "bg-accent",
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type CategoryFormProps = {
  defaultValues?: Partial<CreateCategoryInput>;
  onSubmit: (data: CreateCategoryInput) => void;
  isPending?: boolean;
  submitLabel?: string;
};

export const CategoryForm = ({
  defaultValues,
  onSubmit,
  isPending = false,
  submitLabel,
}: CategoryFormProps) => {
  const form = useForm<CreateCategoryInput>({
    resolver: valibotResolver(CreateCategorySchema),
    defaultValues: {
      name: "",
      emoji: "📦",
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <div className="flex gap-2">
          <FormField
            control={form.control}
            name="emoji"
            render={({ field, fieldState }) => (
              <FormItem className="w-16 shrink-0 gap-1">
                <FormLabel className="text-muted-foreground text-xs tracking-wide uppercase">
                  {m.categories_form_emoji_label()}
                </FormLabel>
                <FormControl>
                  <EmojiPicker
                    value={field.value}
                    onChange={field.onChange}
                    hasError={!!fieldState.error}
                  />
                </FormControl>
                {fieldState.error && (
                  <p className="text-destructive text-sm font-medium">
                    {m.categories_form_emoji_required()}
                  </p>
                )}
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="flex-1 gap-1">
                <FormLabel className="text-muted-foreground text-xs tracking-wide uppercase">
                  {m.categories_form_name_label()}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    autoComplete="off"
                    placeholder={m.categories_form_name_placeholder()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending && <Spinner />}
          {submitLabel ?? m.categories_action_add()}
        </Button>
      </form>
    </Form>
  );
};
