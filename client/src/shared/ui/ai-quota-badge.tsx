import { type FC, useCallback } from "react";
import type { MonthlyUsage } from "shared";
import {
  Badge,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components";
import { track } from "@/shared/lib/analytics";
import { cn } from "@/shared/lib/classes-utils";
import * as m from "@/i18n/messages";
import { AppleIntelligenceIcon } from "./apple-intelligence-icon";

type AiQuotaBadgeProps = {
  usage: Pick<MonthlyUsage, "current" | "limit" | "remaining">;
  className?: string;
  analyticsSource?: "comparator_header" | "comparator_ai_card";
};

const formatQuotaValue = (value: number | null) => String(value ?? 0);

export const AiQuotaBadge: FC<AiQuotaBadgeProps> = ({
  usage,
  className,
  analyticsSource,
}) => {
  const isUnlimited = usage.limit === null;
  const current = formatQuotaValue(usage.current);
  const remaining = formatQuotaValue(usage.remaining);
  const limit = formatQuotaValue(usage.limit);

  const badgeLabel =
    usage.limit === null
      ? `AI: ${m.settings_billing_usage_unlimited()}`
      : m.comparator_ai_quota_badge({ remaining, limit });

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open || !analyticsSource) {
        return;
      }

      track("comparator_ai_quota_badge_opened", {
        source: analyticsSource,
        is_limited: usage.limit !== null,
        used: usage.current,
        remaining: usage.remaining,
        limit: usage.limit,
      });
    },
    [analyticsSource, usage.current, usage.limit, usage.remaining],
  );

  return (
    <Popover onOpenChange={handleOpenChange}>
      <TooltipProvider>
        <Tooltip>
          <PopoverTrigger asChild>
            <TooltipTrigger asChild>
              <Badge
                asChild
                variant="outline"
                className={cn(
                  "text-foreground/90 rounded-full border-cyan-400/50 bg-linear-to-r from-cyan-500/8 via-sky-500/8 to-emerald-500/10 shadow-none",
                  className,
                )}
              >
                <button
                  type="button"
                  className="cursor-help"
                  aria-label={m.comparator_ai_quota_tooltip()}
                >
                  <AppleIntelligenceIcon
                    data-icon="inline-start"
                    className="text-cyan-600 dark:text-cyan-300"
                  />
                  <span className="tabular-nums">{badgeLabel}</span>
                </button>
              </Badge>
            </TooltipTrigger>
          </PopoverTrigger>
          <TooltipContent side="top">
            {m.comparator_ai_quota_tooltip()}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent align="start" className="w-72 space-y-3 p-3">
        <PopoverHeader className="gap-1">
          <PopoverTitle>{m.comparator_ai_quota_popover_title()}</PopoverTitle>
          <PopoverDescription>
            {m.comparator_ai_quota_popover_description()}
          </PopoverDescription>
        </PopoverHeader>

        {isUnlimited ? (
          <p className="bg-muted/60 rounded-md px-2.5 py-2 text-sm font-medium">
            {m.comparator_ai_quota_popover_unlimited()}
          </p>
        ) : (
          <div className="space-y-2">
            <p className="bg-muted/60 rounded-md px-2.5 py-2 text-sm font-semibold tabular-nums">
              {m.comparator_ai_quota_popover_remaining({ remaining, limit })}
            </p>
            <p className="text-muted-foreground text-xs tabular-nums">
              {m.comparator_ai_quota_popover_used({ current })}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
