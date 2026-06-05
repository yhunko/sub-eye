import { Check, X } from "lucide-react";
import { cn } from "@/shared/lib/classes-utils";

type SuggestionToggleButtonProps = {
  enabled: boolean;
  onToggle: () => void;
  toggleLabel: string;
  tooltipText: string;
};

export const SuggestionToggleButton = ({
  enabled,
  onToggle,
  toggleLabel,
  tooltipText,
}: SuggestionToggleButtonProps) => {
  return (
    <button
      type="button"
      title={tooltipText}
      aria-label={toggleLabel}
      aria-pressed={enabled}
      onClick={onToggle}
      className={cn(
        "absolute -top-2.5 -right-2.5 flex size-7 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-cyan-500/70 focus-visible:ring-offset-2 focus-visible:outline-none",
        enabled
          ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 hover:bg-emerald-600"
          : "border border-rose-400/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20",
      )}
    >
      {enabled ? (
        <Check className="size-3.5" strokeWidth={2.5} />
      ) : (
        <X className="size-3.5" strokeWidth={2.5} />
      )}
    </button>
  );
};
