import { createFileRoute } from "@tanstack/react-router";
import { DashboardNavbar, DashboardLayout } from "@/widgets/dashboard-layout";
import {
  AnalyticsWidget,
  CashFlowChart,
  MonthlySpendingTrendChart,
  StatCards,
  UpcomingRenewals,
} from "@/features/analytics";
import { SplashScreen } from "@/shared/ui";

export const Route = createFileRoute("/(protected)/")({
  component: Dashboard,
  pendingComponent: () => <SplashScreen />,
  wrapInSuspense: true,
});

function Dashboard() {
  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <AnalyticsWidget>
        <StatCards className="col-span-full" />
        <CashFlowChart className="lg:col-span-7" />
        <UpcomingRenewals className="h-full lg:col-span-5" />
        <MonthlySpendingTrendChart className="col-span-full" />
      </AnalyticsWidget>
    </DashboardLayout>
  );
}
