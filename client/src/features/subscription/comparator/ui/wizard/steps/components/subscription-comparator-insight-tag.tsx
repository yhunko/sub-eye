import type { LucideIcon } from "lucide-react";
import type { FC } from "react";
import { Badge } from "@/shared/components";
import { cn } from "@/shared/lib/classes-utils";

export type ComparatorInsightTagTone =
  | "positive"
  | "negative"
  | "neutral"
  | "muted";

export type ComparatorInsightTag = {
  id: string;
  label: string;
  icon?: LucideIcon;
  title?: string;
  tone?: ComparatorInsightTagTone;
};

type SubscriptionComparatorInsightTagProps = {
  tag: ComparatorInsightTag;
  className?: string;
};

const toneClassName: Record<ComparatorInsightTagTone, string> = {
  positive: "border-emerald-400/50 bg-emerald-500/15 text-emerald-200",
  negative: "border-rose-400/35 bg-rose-500/10 text-rose-200",
  neutral: "border-amber-400/35 bg-amber-500/10 text-amber-100",
  muted: "border-border/70 bg-muted/60 text-muted-foreground",
};

export const SubscriptionComparatorInsightTag: FC<
  SubscriptionComparatorInsightTagProps
> = ({ tag, className }) => {
  const Icon = tag.icon;
  const tone = tag.tone ?? "muted";

  return (
    <Badge
      variant="outline"
      title={tag.title}
      className={cn(
        "h-6 rounded-full border px-2.5 text-[11px] font-semibold",
        toneClassName[tone],
        className,
      )}
    >
      {Icon ? <Icon aria-hidden className="size-3.5" /> : null}
      <span className="truncate">{tag.label}</span>
    </Badge>
  );
};
