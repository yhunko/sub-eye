import { useDashboardAnalytics } from "@/entities/analytics/api/hooks";
import { StatCard } from "../stat-card";
import { CurrencyText } from "../../../currency";
import { StatCardSkeleton } from "../stat-card-skeleton";
import { useTranslations } from "next-intl";

export const YearlyCostCard = () => {
  const { data, isSuccess } = useDashboardAnalytics();
  const t = useTranslations("analytics.stats.yearlyCost");
  const tCommon = useTranslations("common");

  if (!isSuccess) return <StatCardSkeleton />;

  return (
    <StatCard title={t("title")}>
      <div className="flex h-full flex-col gap-1">
        <div className="text-xl font-bold">
          <CurrencyText
            currencyCode={data?.preferredCurrencyCode}
            amount={data.yearlyForecast}
          />
        </div>
        <div className="text-muted-foreground inline-flex grow items-end text-sm">
          <CurrencyText
            currencyCode={data?.preferredCurrencyCode}
            amount={data.monthlyBurnRate}
          />
          <span>&nbsp;</span>
          <span>{tCommon("per.month")}</span>
        </div>
      </div>
    </StatCard>
  );
};
