import type { FC } from "react";
import * as m from "@/i18n/messages";
import { StatCard } from "../stat-card";

type ActiveSubscriptionsCardProps = {
  total: number;
  auto: number;
  manual: number;
};

export const ActiveSubscriptionsCard: FC<ActiveSubscriptionsCardProps> = ({
  total,
  auto,
  manual,
}) => {
  return (
    <StatCard title={m.analytics_statCards_activeSubscriptions_title()}>
      <div className="flex h-full flex-col gap-1">
        <div className="text-xl font-bold">{total}</div>
        <div className="text-muted-foreground inline-flex grow items-end text-sm">
          <span>
            {auto} {m.analytics_statCards_activeSubscriptions_auto()}
          </span>
          <span>&nbsp;&bull;&nbsp;</span>
          <span>
            {manual} {m.analytics_statCards_activeSubscriptions_manual()}
          </span>
        </div>
      </div>
    </StatCard>
  );
};
