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
      <div className="space-y-1">
        <div className="text-xl font-bold">
          <CurrencyText
            currencyCode={data?.preferredCurrencyCode}
            amount={data.yearlyForecast}
          />
        </div>
        <div className="text-muted-foreground inline-flex gap-2 text-sm">
          <span>
            <CurrencyText
              currencyCode={data?.preferredCurrencyCode}
              amount={data.monthlyBurnRate}
            />{" "}
            {tCommon("per.month")}
          </span>
        </div>
      </div>
    </StatCard>
  );
};
