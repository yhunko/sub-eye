import { useRef, useState, type KeyboardEvent } from "react";
import { CATEGORY_EMOJIS } from "shared";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components";
import { cn } from "@/shared/lib/classes-utils";
import * as m from "@/i18n/messages";
import { EMOJI_GROUPS } from "../model/emoji-groups";
import { resolveNextEmojiFocusIndex } from "../model/emoji-navigation";

const GROUPS_WITH_IDX = (() => {
  let idx = 0;
  return EMOJI_GROUPS.map(({ label, emojis }) => ({
    label,
    emojis: emojis.map((emoji) => ({ emoji, idx: idx++ })),
  }));
})();

type EmojiPickerProps = {
  value: string;
  onChange: (emoji: string) => void;
  hasError?: boolean;
  triggerClassName?: string;
};

export function EmojiPicker({
  value,
  onChange,
  hasError,
  triggerClassName,
}: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(() =>
    Math.max(0, CATEGORY_EMOJIS.indexOf(value)),
  );
  const gridRef = useRef<HTMLDivElement>(null);

  const focusByIndex = (idx: number) => {
    setFocusedIdx(idx);
    requestAnimationFrame(() => {
      const button = gridRef.current?.querySelector<HTMLButtonElement>(
        `[data-idx="${idx}"]`,
      );
      button?.focus({ preventScroll: true });
      button?.scrollIntoView({ block: "nearest" });
    });
  };

  const openPicker = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      focusByIndex(Math.max(0, CATEGORY_EMOJIS.indexOf(value)));
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const nextFocusIdx = resolveNextEmojiFocusIndex({
      key: event.key,
      currentIndex: focusedIdx,
      total: CATEGORY_EMOJIS.length,
    });

    if (nextFocusIdx !== null) {
      event.preventDefault();
      focusByIndex(nextFocusIdx);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (focusedIdx >= 0) {
        onChange(CATEGORY_EMOJIS[focusedIdx]);
        setOpen(false);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={openPicker}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={
            value
              ? `${m.categories_form_emoji_label()}: ${value}`
              : m.categories_form_emoji_placeholder()
          }
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-invalid={hasError || undefined}
          className={cn(
            "dark:bg-input/30 h-9 w-full justify-center px-0 text-2xl",
            "aria-invalid:border-destructive",
            triggerClassName,
          )}
        >
          {value || (
            <span className="text-muted-foreground text-sm">
              {m.categories_form_emoji_placeholder()}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-64 p-2"
        role="listbox"
        aria-label={m.categories_form_emoji_label()}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          focusByIndex(Math.max(0, CATEGORY_EMOJIS.indexOf(value)));
        }}
      >
        <div
          ref={gridRef}
          role="presentation"
          className="h-72 overflow-y-auto"
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
                    role="option"
                    aria-selected={value === emoji}
                    aria-label={`${m.categories_form_emoji_label()}: ${emoji}`}
                    data-idx={idx}
                    tabIndex={focusedIdx === idx ? 0 : -1}
                    onFocus={() => setFocusedIdx(idx)}
                    onClick={() => {
                      onChange(emoji);
                      setOpen(false);
                    }}
                    className={cn(
                      "hover:bg-accent focus:bg-accent flex h-9 w-9 items-center justify-center rounded text-xl transition-colors focus:outline-none",
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
      </PopoverContent>
    </Popover>
  );
}
