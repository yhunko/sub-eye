import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@clerk/clerk-react";
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
        <StatCards className="col-span-full" />
        <CashFlowChart className="lg:col-span-7" />
        <UpcomingRenewals className="h-full lg:col-span-5" />
        <CategorySpendingChart className="lg:col-span-5" />
        <MonthlySpendingTrendChart className="h-full lg:col-span-7" />
      </AnalyticsWidget>
    </DashboardLayout>
  );
}
