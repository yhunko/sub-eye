import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@clerk/clerk-react";
import { useUser } from "@clerk/clerk-react";
import { useActiveSpace } from "@/shared/lib/org/use-active-space";
import { useSuspenseQuery } from "@tanstack/react-query";
import { dashboardAnalyticsQuery } from "@/entities/analytics";
import {
  AnalyticsWidget,
  CashFlowChart,
  CategorySpendingChart,
  MonthlySpendingTrendChart,
  StatCards,
  UpcomingRenewals,
  EmptyDashboard,
} from "@/features/analytics";
import { DashboardNavbar, DashboardLayout } from "@/widgets/dashboard-layout";
import { SplashScreen } from "@/shared/ui";
import { valibotValidator } from "@tanstack/valibot-adapter";
import { dashboardSearchSchema } from "@/shared/lib/router/dashboard-search";

export const Route = createFileRoute("/(protected)/")({
  component: Dashboard,
  pendingComponent: () => <SplashScreen />,
  wrapInSuspense: true,
  validateSearch: valibotValidator(dashboardSearchSchema),
});

// eslint-disable-next-line react-refresh/only-export-components
function Dashboard() {
  const { userId } = useAuth();
  const { orgId } = useActiveSpace();
  const { user } = useUser();
  const timezone =
    (user?.publicMetadata as { preferredTimezone?: string } | undefined)
      ?.preferredTimezone ?? "UTC";

  const { data: analytics } = useSuspenseQuery(
    dashboardAnalyticsQuery({
      params: { userId: userId!, orgId },
    }),
  );

  // Empty state
  if (analytics.activeSubscriptionsTotal === 0) {
    return (
      <DashboardLayout Navbar={<DashboardNavbar />}>
        <EmptyDashboard />
      </DashboardLayout>
    );
  }

  // Normal state
  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
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
    </DashboardLayout>
  );
}
