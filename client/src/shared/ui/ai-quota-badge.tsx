import { type FC } from "react";
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
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

type AiQuotaBadgeProps = {
  usage: Pick<MonthlyUsage, "current" | "limit" | "remaining">;
  className?: string;
  analyticsSource?:
    | "comparator_header"
    | "comparator_ai_card"
    | "category_ai_generator"
    | "category_ai_optimizer";
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
      ? m.ai_usage_badge_unlimited()
      : m.ai_usage_badge({ remaining, limit });

  const handleOpenChange = (open: boolean) => {
    if (!open || !analyticsSource) {
      return;
    }

    track("ai_quota_badge_opened", {
      source: analyticsSource,
      is_limited: usage.limit !== null,
      used: usage.current,
      remaining: usage.remaining,
      limit: usage.limit,
    });
  };

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
                  aria-label={m.ai_usage_tooltip()}
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
          <TooltipContent side="top">{m.ai_usage_tooltip()}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent align="start" className="w-72 space-y-3 p-3">
        <PopoverHeader className="gap-1">
          <PopoverTitle>{m.ai_usage_popover_title()}</PopoverTitle>
          <PopoverDescription>
            {m.ai_usage_popover_description()}
          </PopoverDescription>
        </PopoverHeader>

        {isUnlimited ? (
          <p className="bg-muted/60 rounded-md px-2.5 py-2 text-sm font-medium">
            {m.ai_usage_popover_unlimited()}
          </p>
        ) : (
          <div className="space-y-2">
            <p className="bg-muted/60 rounded-md px-2.5 py-2 text-sm font-semibold tabular-nums">
              {m.ai_usage_popover_remaining({ remaining, limit })}
            </p>
            <p className="text-muted-foreground text-xs tabular-nums">
              {m.ai_usage_popover_used({ current })}
            </p>
            <Link
              to="/settings/billing"
              className="group flex items-center gap-1.5 rounded-md border border-cyan-500/30 bg-cyan-500/5 px-2.5 py-1.5 text-xs font-medium text-cyan-700 transition-colors hover:bg-cyan-500/10 dark:text-cyan-300"
            >
              {m.ai_usage_popover_upgrade_hint()}
              <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
