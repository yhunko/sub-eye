import { createFileRoute } from "@tanstack/react-router";
import { DashboardNavbar, DashboardLayout } from "@/widgets/dashboard-layout";
import {
  AnalyticsWidget,
  CashFlowChart,
  MonthlySpendingTrendChart,
  StatCards,
  UpcomingRenewals,
} from "@/features/analytics";

export const Route = createFileRoute("/(protected)/")({
  component: Dashboard,
  // loader: async ({ context }) => {
  //   await context.queryClient.ensureQueryData(
  //     dashboardAnalyticsQuery({
  //       params: {
  //         userId: context.auth.userId!,
  //       },
  //     }),
  //   );
  // },
});

function Dashboard() {
  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <AnalyticsWidget>
        <StatCards className="col-span-full" />
        <div className="lg:col-span-7">
          <CashFlowChart />
        </div>
        <div className="lg:col-span-5">
          <UpcomingRenewals className="h-full" />
        </div>
        <MonthlySpendingTrendChart className="col-span-full" />
      </AnalyticsWidget>
    </DashboardLayout>
  );
}
