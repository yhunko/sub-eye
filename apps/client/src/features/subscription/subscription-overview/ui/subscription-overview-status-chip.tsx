import type { SubscriptionDto } from "@subeye/shared";
import type { FC } from "react";
import {
  getSubscriptionPresentation,
  type SubscriptionPresentationTone,
} from "@/entities/subscription";
import { cn } from "@/shared/lib/classes-utils";

const toneClasses: Record<SubscriptionPresentationTone, string> = {
  active:
    "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
  trial: "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300",
  discount:
    "bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300",
  scheduled:
    "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
  cancelling:
    "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
  cancelled: "bg-muted text-muted-foreground ring-border",
};

type SubscriptionOverviewStatusChipProps = {
  subscription: SubscriptionDto;
  formatDate?: (iso: string) => string;
};

export const SubscriptionOverviewStatusChip: FC<
  SubscriptionOverviewStatusChipProps
> = ({ subscription, formatDate }) => {
  const presentation = getSubscriptionPresentation(subscription, {
    formatDate,
  });

  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset",
          toneClasses[presentation.tone],
        )}
      >
        <span className="size-1.5 rounded-full bg-current" aria-hidden />
        {presentation.label}
      </span>
      {presentation.detail && (
        <span className="text-muted-foreground text-xs">
          {presentation.detail}
        </span>
      )}
    </div>
  );
};
