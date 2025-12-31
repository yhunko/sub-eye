import { useDashboardAnalytics } from "@/entities/analytics/api/hooks";
import { StatCardSkeleton } from "../stat-card-skeleton";
import { StatCard } from "../stat-card";
import { CurrencyText } from "../../../currency";

export const MostExpensiveSubscriptionCard = () => {
  const { data, isSuccess } = useDashboardAnalytics();

  if (!isSuccess || !data?.mostExpensiveSubscription)
    return <StatCardSkeleton />;

  return (
    <StatCard title="Most expensive">
      <div className="space-y-1">
        <div className="text-xl font-bold">
          {data?.mostExpensiveSubscription?.name}
        </div>
        <div className="text-muted-foreground inline-flex gap-2 text-sm">
          <span>
            <CurrencyText
              amount={data.mostExpensiveSubscription.yearlyAmount}
              currencyCode={data.currencyCode}
            />{" "}
            / year
          </span>
        </div>
      </div>
    </StatCard>
  );
};
