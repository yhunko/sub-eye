import { useDashboardAnalytics } from "@/entities/analytics/api/hooks";
import { StatCardSkeleton } from "../stat-card-skeleton";
import { StatCard } from "../stat-card";
import { CurrencyText } from "../../../currency";

export const RemainingThisMonthCard = () => {
  const { data, isSuccess } = useDashboardAnalytics();

  if (!isSuccess) return <StatCardSkeleton />;

  return (
    <StatCard title="Remaining this month">
      <div className="space-y-1">
        <div className="text-xl font-bold">
          <CurrencyText
            amount={data?.remainingThisMonth}
            currencyCode={data.currencyCode}
          />
        </div>
        <div className="text-muted-foreground text-xs sm:text-sm">
          Next month forecast:
          <CurrencyText
            amount={data?.monthlyBurnRate}
            currencyCode={data.currencyCode}
          />
        </div>
      </div>
    </StatCard>
  );
};
