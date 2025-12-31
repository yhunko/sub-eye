import { useDashboardAnalytics } from "@/entities/analytics/api/hooks";
import { StatCard } from "../stat-card";
import { CurrencyText } from "../../../currency";
import { StatCardSkeleton } from "../stat-card-skeleton";

export const YearlyCostCard = () => {
  const { data, isSuccess } = useDashboardAnalytics();

  if (!isSuccess) return <StatCardSkeleton />;

  return (
    <StatCard title="Yearly Cost">
      <div className="space-y-1">
        <div className="text-xl font-bold">
          <CurrencyText
            currencyCode={data.currencyCode}
            amount={data.yearlyForecast}
          />
        </div>
        <div className="text-muted-foreground inline-flex gap-2 text-sm">
          <span>
            <CurrencyText
              currencyCode={data.currencyCode}
              amount={data.monthlyBurnRate}
            />{" "}
            / month
          </span>
        </div>
      </div>
    </StatCard>
  );
};
