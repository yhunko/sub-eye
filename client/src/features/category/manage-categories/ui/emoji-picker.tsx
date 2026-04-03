import { type KeyboardEvent, lazy, Suspense, useRef, useState } from "react";
import { CATEGORY_EMOJIS } from "shared";
import * as m from "@/i18n/messages";
import { Button } from "@/shared/components";
import { useBreakpoint } from "@/shared/hooks/use-breakpoint";
import { cn } from "@/shared/lib/classes-utils";
import { EMOJI_GROUPS } from "../model/emoji-groups";
import { resolveNextEmojiFocusIndex } from "../model/emoji-navigation";

const EmojiPickerDesktop = lazy(() => import("./emoji-picker.desktop"));
const EmojiPickerMobile = lazy(() => import("./emoji-picker.mobile"));

const GROUPS_WITH_IDX = (() => {
  let idx = 0;
  return EMOJI_GROUPS.map(({ label, emojis }) => {
    const indexedEmojis = emojis.map((emoji) => ({ emoji, idx: idx++ }));
    return {
      label,
      emojis: indexedEmojis,
    };
  });
})();
const EMOJI_GROUP_SIZES = GROUPS_WITH_IDX.map((group) => group.emojis.length);

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
  const isDesktop = useBreakpoint("lg");
  const [open, setOpen] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );
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
      if (isDesktop && typeof document !== "undefined") {
        const activeElement = document.activeElement as HTMLElement | null;
        setPortalContainer(
          activeElement?.closest<HTMLElement>('[data-slot="dialog-content"]') ??
            null,
        );
      } else {
        setPortalContainer(null);
      }
      focusByIndex(Math.max(0, CATEGORY_EMOJIS.indexOf(value)));
      return;
    }

    setPortalContainer(null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const nextFocusIdx = resolveNextEmojiFocusIndex({
      key: event.key,
      shiftKey: event.shiftKey,
      currentIndex: focusedIdx,
      total: CATEGORY_EMOJIS.length,
      cols: 6,
      groupSizes: EMOJI_GROUP_SIZES,
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

  const Trigger = (
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
  );

  const Content = (
    <div
      className={cn(
        "flex flex-col",
        isDesktop ? "max-h-[min(72vh,28rem)]" : "max-h-[min(80vh,40rem)]",
      )}
    >
      <div
        ref={gridRef}
        role="presentation"
        aria-label={m.categories_form_emoji_label()}
        className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain pr-0.5 [-webkit-overflow-scrolling:touch]"
        onKeyDown={handleKeyDown}
      >
        {GROUPS_WITH_IDX.map((group) => (
          <div
            key={group.label}
            className="bg-muted/20 mb-1.5 scroll-mt-2 rounded-md border p-1 last:mb-0"
          >
            <p className="text-muted-foreground mb-1 px-0.5 text-base leading-none font-medium">
              {group.label}
            </p>
            <div className="grid grid-cols-6 justify-items-center gap-1">
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
                    "hover:bg-accent focus:bg-accent flex touch-manipulation items-center justify-center rounded transition-colors focus:outline-none",
                    isDesktop ? "size-10 text-2xl" : "size-11 text-[2rem]",
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
  );

  if (!isDesktop) {
    return (
      <Suspense fallback={Trigger}>
        <EmojiPickerMobile
          open={open}
          onOpenChange={openPicker}
          trigger={Trigger}
          content={Content}
          title={m.categories_form_emoji_label()}
          description={m.categories_form_emoji_placeholder()}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={Trigger}>
      <EmojiPickerDesktop
        open={open}
        onOpenChange={openPicker}
        trigger={Trigger}
        content={Content}
        container={portalContainer}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          focusByIndex(Math.max(0, CATEGORY_EMOJIS.indexOf(value)));
        }}
      />
    </Suspense>
  );
}
