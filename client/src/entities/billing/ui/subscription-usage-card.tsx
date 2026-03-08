import type { FC } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
} from "@/shared/components";
import * as m from "@/i18n/messages";
import type { PlanUsage } from "shared";

type SubscriptionUsageCardProps = {
  usage: PlanUsage;
};

export const SubscriptionUsageCard: FC<SubscriptionUsageCardProps> = ({
  usage,
}) => {
  const { current, limit } = usage.subscriptions;
  const percentage = Math.round((current / limit) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {m.settings_billing_usage_title()}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span>{m.settings_billing_usage_subscriptions()}</span>
            <span className="text-muted-foreground tabular-nums">
              {m.settings_billing_usage_subscriptionsOf({
                current: String(current),
                limit: String(limit),
              })}
            </span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
};
