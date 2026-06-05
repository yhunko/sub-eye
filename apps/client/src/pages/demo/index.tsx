import { createFileRoute } from "@tanstack/react-router";
import {
  AnalyticsWidget,
  CashFlowChart,
  CategorySpendingChart,
  MonthlySpendingTrendChart,
  StatCards,
  UpcomingRenewals,
} from "@/features/analytics";
import { demoDashboardAnalytics } from "@/shared/lib/demo/data";

export const Route = createFileRoute("/demo/")({
  component: DemoDashboard,
});

const analytics = demoDashboardAnalytics;
const timezone = "America/New_York";

function DemoDashboard() {
  return (
    <AnalyticsWidget>
      <StatCards data={analytics} className="col-span-full" />
      <CashFlowChart
        cashFlowForecast={analytics.cashFlowForecast}
        totalUpcomingMonth={analytics.totalUpcomingMonth}
        preferredCurrencyCode={analytics.preferredCurrencyCode}
        timezone={timezone}
        className="lg:col-span-7"
      />
      <UpcomingRenewals
        upcomingRenewals={analytics.upcomingRenewals}
        timezone={timezone}
        disableLinks
        className="h-full lg:col-span-5"
      />
      <CategorySpendingChart
        categorySpending={analytics.categorySpending}
        preferredCurrencyCode={analytics.preferredCurrencyCode}
        className="lg:col-span-5"
      />
      <MonthlySpendingTrendChart
        monthlyTrend={analytics.monthlyTrend}
        preferredCurrencyCode={analytics.preferredCurrencyCode}
        className="h-full lg:col-span-7"
      />
    </AnalyticsWidget>
  );
}
