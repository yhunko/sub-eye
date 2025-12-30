import { DashboardNavbar, DashboardLayout } from "@/features/dashboard";
import { CashFlowChart } from "@/features/analytics/ui/cash-flow-chart";
import { AnalyticsWidget } from "@/features/analytics/ui/analytics-widget";

export default async function Home() {
  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <AnalyticsWidget>
        <CashFlowChart />
      </AnalyticsWidget>
    </DashboardLayout>
  );
}
