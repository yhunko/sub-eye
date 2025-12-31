import { FC } from "react";
import { useDashboardAnalytics } from "@/entities/analytics/api/hooks";
import { StatCard } from "../stat-card";
import { StatCardSkeleton } from "../stat-card-skeleton";

export const ActiveSubscriptionsCard: FC = () => {
  const { data, isSuccess } = useDashboardAnalytics();

  if (!isSuccess) return <StatCardSkeleton />;

  return (
    <StatCard title="Active Subscriptions">
      <div className="space-y-1">
        <div className="text-xl font-bold">{data.activeSubscriptionsTotal}</div>
        <div className="text-muted-foreground inline-flex gap-2 text-sm">
          <span>{data.activeSubscriptionsAuto} auto</span>
          <span>&bull;</span>
          <span>{data.activeSubscriptionsManual} manual</span>
        </div>
      </div>
    </StatCard>
  );
};
