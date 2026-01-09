import { DashboardNavbar, DashboardLayout } from "@/features/dashboard";
import {
  CashFlowChart,
  AnalyticsWidget,
  UpcomingRenewals,
  StatCards,
  MonthlySpendingTrendChart,
} from "@/features/analytics";

export default async function Home() {
  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <AnalyticsWidget>
        <StatCards className="col-span-full" />
        <CashFlowChart />
        <UpcomingRenewals />
        <MonthlySpendingTrendChart className="col-span-full" />
      </AnalyticsWidget>
    </DashboardLayout>
  );
}
