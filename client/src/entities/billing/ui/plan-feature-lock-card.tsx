import type { FC, ReactNode } from "react";
import { useEffect } from "react";
import { Badge, Button } from "@/shared/components";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/shared/lib/classes-utils";
import * as m from "@/i18n/messages";
import { track } from "@/shared/lib/analytics";

type UpgradePromptSource =
  | "subscription_limit"
  | "comparator_quota"
  | "comparator_ai"
  | "notification_schedule"
  | "settings_billing";

type PlanFeatureLockCardProps = {
  title: string;
  description: string;
  to?: "/settings/billing";
  badgeLabel?: string;
  ctaLabel?: string;
  icon?: ReactNode;
  className?: string;
  onCtaClick?: () => void | Promise<void>;
  analyticsSource?: UpgradePromptSource;
  analyticsFeature?: string;
};

export const PlanFeatureLockCard: FC<PlanFeatureLockCardProps> = ({
  title,
  description,
  to = "/settings/billing",
  badgeLabel,
  ctaLabel,
  icon,
  className,
  onCtaClick,
  analyticsSource,
  analyticsFeature,
}) => {
  useEffect(() => {
    if (analyticsSource) {
      track("upgrade_prompt_viewed", {
        source: analyticsSource,
        feature: analyticsFeature ?? "plus_plan",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-amber-300/60 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 p-4 shadow-sm dark:border-amber-700/40 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-yellow-950/30",
        className,
      )}
    >
      <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-amber-200/40 blur-xl dark:bg-amber-500/20" />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {icon ?? <Sparkles className="h-4 w-4 text-amber-600" />}
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              {badgeLabel ?? m.billing_proFeature_badge()}
            </Badge>
          </div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>

        {onCtaClick ? (
          <Button
            size="sm"
            className="gap-1.5 self-start sm:self-center"
            onClick={onCtaClick}
          >
            {ctaLabel ?? m.billing_proFeature_viewPlans()}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            asChild
            size="sm"
            className="gap-1.5 self-start sm:self-center"
          >
            <Link to={to}>
              {ctaLabel ?? m.billing_proFeature_viewPlans()}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
};
