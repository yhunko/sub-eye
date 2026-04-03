import type { FC } from "react";
import { cn } from "@/shared/lib/classes-utils";

type InsightStatProps = {
  label: string;
  value: string;
  caption?: string;
  toneClassName?: string;
  className?: string;
};

export const SubscriptionHistoryInsightStat: FC<InsightStatProps> = ({
  label,
  value,
  caption,
  toneClassName,
  className,
}) => (
  <div
    className={cn(
      "rounded-xl border border-white/45 bg-gradient-to-b from-white/80 to-white/50 p-2.5 shadow-xs backdrop-blur-sm md:p-4 dark:border-white/10 dark:from-white/5 dark:to-white/[0.02]",
      className,
    )}
  >
    <p className="text-muted-foreground text-[10px] tracking-[0.08em] uppercase md:text-[11px]">
      {label}
    </p>
    <p
      className={cn(
        "mt-1.5 text-sm font-semibold md:mt-2 md:text-lg",
        toneClassName,
      )}
    >
      {value}
    </p>
    {caption && (
      <p className="text-muted-foreground mt-0.5 line-clamp-1 text-[11px] md:mt-1 md:line-clamp-none md:text-xs">
        {caption}
      </p>
    )}
  </div>
);
