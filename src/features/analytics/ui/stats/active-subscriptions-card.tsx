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
      <div className="flex h-full flex-col gap-1">
        <div className="text-xl font-bold">{data.activeSubscriptionsTotal}</div>
        <div className="text-muted-foreground inline-flex grow items-end text-sm">
          <span>
            {data.activeSubscriptionsAuto} {t("auto")}
          </span>
          <span>&nbsp;&bull;&nbsp;</span>
          <span>
            {data.activeSubscriptionsManual} {t("manual")}
          </span>
        </div>
      </div>
    </StatCard>
  );
};
