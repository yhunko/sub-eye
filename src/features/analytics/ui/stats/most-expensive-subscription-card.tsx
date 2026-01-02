import { useDashboardAnalytics } from "@/entities/analytics/api/hooks";
import { StatCardSkeleton } from "../stat-card-skeleton";
import { StatCard } from "../stat-card";
import { CurrencyText } from "../../../currency";
import { BrandfetchImage } from "../../../brandfetch";

export const MostExpensiveSubscriptionCard = () => {
  const { data, isSuccess } = useDashboardAnalytics();

  if (!isSuccess || !data?.mostExpensiveSubscription)
    return <StatCardSkeleton />;

  return (
    <StatCard title="Most expensive">
      <div className="space-y-1">
        <div className="flex flex-row items-center gap-2">
          <BrandfetchImage
            domain={data.mostExpensiveSubscription?.brandDomain}
          />
          <div className="text-base sm:text-xl sm:font-bold">
            {data?.mostExpensiveSubscription?.name}
          </div>
        </div>
        <div className="text-muted-foreground inline-flex gap-2 text-sm">
          <span>
            <CurrencyText
              amount={data.mostExpensiveSubscription.yearlyAmount}
              currencyCode={data.preferredCurrencyCode}
            />{" "}
            / year
          </span>
        </div>
      </div>
    </StatCard>
  );
};
