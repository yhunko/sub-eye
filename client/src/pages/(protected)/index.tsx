import { createFileRoute } from "@tanstack/react-router";
import { DashboardNavbar, DashboardLayout } from "@/widgets/dashboard-layout";
import {
  AnalyticsWidget,
  CashFlowChart,
  CategorySpendingChart,
  MonthlySpendingTrendChart,
  StatCards,
  UpcomingRenewals,
} from "@/features/analytics";
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
  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <AnalyticsWidget>
        <StatCards className="col-span-full" />
        <CashFlowChart className="lg:col-span-7" />
        <UpcomingRenewals className="h-full lg:col-span-5" />
        <CategorySpendingChart className="lg:col-span-5" />
        <MonthlySpendingTrendChart className="lg:col-span-7" />
      </AnalyticsWidget>
    </DashboardLayout>
  );
}
