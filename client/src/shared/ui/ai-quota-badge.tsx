import type { FC } from "react";
import type { MonthlyUsage } from "shared";
import { Badge } from "@/shared/components";
import { cn } from "@/shared/lib/classes-utils";
import { AppleIntelligenceIcon } from "./apple-intelligence-icon";

type AiQuotaBadgeProps = {
  usage: Pick<MonthlyUsage, "limit" | "remaining">;
  label?: string;
  unlimitedLabel?: string;
  className?: string;
};

const formatQuotaValue = (value: number | null) => String(value ?? 0);

export const AiQuotaBadge: FC<AiQuotaBadgeProps> = ({
  usage,
  label = "AI",
  unlimitedLabel = "Unlimited",
  className,
}) => {
  const badgeLabel =
    usage.limit === null
      ? `${label}: ${unlimitedLabel}`
      : `${label}: ${formatQuotaValue(usage.remaining)}/${formatQuotaValue(usage.limit)}`;

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-foreground/90 rounded-full border-cyan-400/50 bg-linear-to-r from-cyan-500/8 via-sky-500/8 to-emerald-500/10 shadow-none",
        className,
      )}
    >
      <AppleIntelligenceIcon
        data-icon="inline-start"
        className="text-cyan-600 dark:text-cyan-300"
      />
      <span className="tabular-nums">{badgeLabel}</span>
    </Badge>
  );
};
