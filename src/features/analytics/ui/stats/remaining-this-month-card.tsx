import { useDashboardAnalytics } from "@/entities/analytics/api/hooks";
import { StatCardSkeleton } from "../stat-card-skeleton";
import { StatCard } from "../stat-card";
import { CurrencyText } from "../../../currency";
import { useTranslations } from "next-intl";

export const RemainingThisMonthCard = () => {
  const { data, isSuccess } = useDashboardAnalytics();
  const t = useTranslations("analytics.stats.remainingThisMonth");

  if (!isSuccess) return <StatCardSkeleton />;

  return (
    <StatCard title={t("title")}>
      <div className="space-y-1">
        <div className="text-xl font-bold">
          <CurrencyText
            amount={data?.remainingThisMonth}
            currencyCode={data?.preferredCurrencyCode}
          />
        </div>
        <div className="text-muted-foreground text-xs sm:text-sm">
          {t("nextMonthForecast")}&nbsp;
          <CurrencyText
            amount={data?.monthlyBurnRate}
            currencyCode={data?.preferredCurrencyCode}
          />
        </div>
      </div>
    </StatCard>
  );
};
