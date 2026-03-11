import type { FC } from "react";
import { format, parseISO } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
} from "@/shared/components";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import * as m from "@/i18n/messages";
import type { PlanUsage } from "shared";

type SubscriptionUsageCardProps = {
  usage: PlanUsage;
};

const resolveProgress = (
  current: number,
  limit: number | null,
): number | null => {
  if (limit === null || limit <= 0) {
    return null;
  }

  const percentage = Math.round((current / limit) * 100);
  return Math.min(Math.max(percentage, 0), 100);
};

const formatResetsAt = (value: string, dateFnsFormat: string): string => {
  const date = parseISO(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, dateFnsFormat);
};

export const SubscriptionUsageCard: FC<SubscriptionUsageCardProps> = ({
  usage,
}) => {
  const { dateFnsFormat } = useDateFormat();
  const subscriptionsProgress = resolveProgress(
    usage.subscriptions.current,
    usage.subscriptions.limit,
  );
  const comparisonsProgress = resolveProgress(
    usage.comparatorComparisons.current,
    usage.comparatorComparisons.limit,
  );
  const aiProgress = resolveProgress(
    usage.comparatorAiInsights.current,
    usage.comparatorAiInsights.limit,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {m.settings_billing_usage_title()}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span>{m.settings_billing_usage_subscriptions()}</span>
            <span className="text-muted-foreground tabular-nums">
              {m.settings_billing_usage_subscriptionsOf({
                current: String(usage.subscriptions.current),
                limit: String(usage.subscriptions.limit),
              })}
            </span>
          </div>
          <Progress value={subscriptionsProgress ?? 0} className="h-2" />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span>{m.settings_billing_usage_comparisons()}</span>
            <span className="text-muted-foreground tabular-nums">
              {usage.comparatorComparisons.limit === null
                ? m.settings_billing_usage_unlimited()
                : m.settings_billing_usage_subscriptionsOf({
                    current: String(usage.comparatorComparisons.current),
                    limit: String(usage.comparatorComparisons.limit),
                  })}
            </span>
          </div>
          <Progress value={comparisonsProgress ?? 0} className="h-2" />
          <p className="text-muted-foreground text-xs">
            {m.settings_billing_usage_resetsOn({
              date: formatResetsAt(
                usage.comparatorComparisons.resetsAt,
                dateFnsFormat,
              ),
            })}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span>{m.settings_billing_usage_aiInsights()}</span>
            <span className="text-muted-foreground tabular-nums">
              {usage.comparatorAiInsights.limit === null
                ? m.settings_billing_usage_unlimited()
                : m.settings_billing_usage_subscriptionsOf({
                    current: String(usage.comparatorAiInsights.current),
                    limit: String(usage.comparatorAiInsights.limit),
                  })}
            </span>
          </div>
          <Progress value={aiProgress ?? 0} className="h-2" />
          <p className="text-muted-foreground text-xs">
            {m.settings_billing_usage_resetsOn({
              date: formatResetsAt(
                usage.comparatorAiInsights.resetsAt,
                dateFnsFormat,
              ),
            })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
