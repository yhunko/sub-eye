import { useEffect, useRef, useState } from "react";
import { cn } from "@/shared/lib/classes-utils";
import * as m from "@/i18n/messages";
import { EMOJI_GROUPS } from "../model/emoji-groups";

const COLS = 6;

// Pre-computed flat list used for keyboard navigation index mapping.
// Built once at module load; safe because EMOJI_GROUPS is a static constant.
const FLAT_EMOJIS = EMOJI_GROUPS.flatMap((g) => g.emojis);

// Same structure enriched with a sequential flat index per emoji.
// The index is written to data-idx and read back for O(1) focus targeting.
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
};

export function EmojiPicker({ value, onChange, hasError }: EmojiPickerProps) {
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

  // When the dropdown opens, focus the selected emoji (or the first one).
  // `value` is intentionally excluded from deps: re-running while open would
  // reset keyboard focus mid-interaction.
  useEffect(() => {
    if (!open) return;
    const initial = FLAT_EMOJIS.indexOf(value);
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
        aria-label={
          value
            ? `${m.categories_form_emoji_label()}: ${value}`
            : m.categories_form_emoji_placeholder()
        }
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={hasError || undefined}
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
        <div
          role="listbox"
          aria-label={m.categories_form_emoji_label()}
          className="bg-popover absolute top-full left-0 z-50 mt-1 w-64 rounded-md border shadow-md"
        >
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
                      role="option"
                      aria-selected={value === emoji}
                      aria-label={emoji}
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
