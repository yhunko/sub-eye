import { useDashboardAnalytics } from "@/entities/analytics/api/hooks";
import { StatCardSkeleton } from "../stat-card-skeleton";
import { StatCard } from "../stat-card";
import { CurrencyText } from "../../../currency";
import { BrandfetchImage } from "../../../brandfetch";
import { useTranslations } from "next-intl";

export const MostExpensiveSubscriptionCard = () => {
  const { data, isSuccess } = useDashboardAnalytics();
  const t = useTranslations("analytics.stats.mostExpensive");
  const tCommon = useTranslations("common");

  if (!isSuccess || !data?.mostExpensiveSubscription)
    return <StatCardSkeleton />;

  return (
    <StatCard title={t("title")}>
      <div className="flex h-full flex-col gap-1">
        <div className="flex flex-row items-center gap-2">
          <BrandfetchImage
            domain={data.mostExpensiveSubscription?.brandDomain}
          />
          <div className="text-base sm:text-xl sm:font-bold">
            {data?.mostExpensiveSubscription?.name}
          </div>
        </div>
        <div className="text-muted-foreground inline-flex grow items-end text-sm">
          <CurrencyText
            amount={data.mostExpensiveSubscription.yearlyAmount}
            currencyCode={data.preferredCurrencyCode}
          />
          <span>&nbsp;</span>
          <span>{tCommon("per.year")}</span>
        </div>
      </div>
    </StatCard>
  );
};
