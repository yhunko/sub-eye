import { FC } from "react";
import { useAuth } from "@clerk/clerk-react";
import { dashboardAnalyticsQuery } from "@/entities/analytics";
import { StatCard } from "../stat-card";
import { StatCardSkeleton } from "../stat-card-skeleton";
import * as m from "@/i18n/messages";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useActiveSpace } from "@/shared/lib/org/use-active-space";

export const ActiveSubscriptionsCard: FC = () => {
  const { userId } = useAuth();
  const { orgId } = useActiveSpace();

  const { data } = useSuspenseQuery(
    dashboardAnalyticsQuery({
      params: { userId: userId!, orgId },
      options: { enabled: true },
    }),
  );

  if (!userId) return <StatCardSkeleton />;

  return (
    <StatCard title={m.analytics_statCards_activeSubscriptions_title()}>
      <div className="flex h-full flex-col gap-1">
        <div className="text-xl font-bold">{data.activeSubscriptionsTotal}</div>
        <div className="text-muted-foreground inline-flex grow items-end text-sm">
          <span>
            {data.activeSubscriptionsAuto}{" "}
            {m.analytics_statCards_activeSubscriptions_auto()}
          </span>
          <span>&nbsp;&bull;&nbsp;</span>
          <span>
            {data.activeSubscriptionsManual}{" "}
            {m.analytics_statCards_activeSubscriptions_manual()}
          </span>
        </div>
      </div>
    </StatCard>
  );
};
