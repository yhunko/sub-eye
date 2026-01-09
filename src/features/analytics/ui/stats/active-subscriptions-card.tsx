import { FC } from "react";
import { useDashboardAnalytics } from "@/entities/analytics/api/hooks";
import { StatCard } from "../stat-card";
import { StatCardSkeleton } from "../stat-card-skeleton";
import { useTranslations } from "next-intl";

export const ActiveSubscriptionsCard: FC = () => {
  const { data, isSuccess } = useDashboardAnalytics();
  const t = useTranslations("analytics.stats.activeSubscriptions");

  if (!isSuccess) return <StatCardSkeleton />;

  return (
    <StatCard title={t("title")}>
      <div className="space-y-1">
        <div className="text-xl font-bold">{data.activeSubscriptionsTotal}</div>
        <div className="text-muted-foreground inline-flex gap-2 text-sm">
          <span>
            {data.activeSubscriptionsAuto} {t("auto")}
          </span>
          <span>&bull;</span>
          <span>
            {data.activeSubscriptionsManual} {t("manual")}
          </span>
        </div>
      </div>
    </StatCard>
  );
};
