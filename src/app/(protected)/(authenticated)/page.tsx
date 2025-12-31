import { DashboardNavbar, DashboardLayout } from "@/features/dashboard";
import {
  CashFlowChart,
  AnalyticsWidget,
  UpcomingRenewals,
  StatCards,
} from "@/features/analytics";

export default async function Home() {
  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <AnalyticsWidget>
        <StatCards className="col-span-full" />
        <CashFlowChart />
        <UpcomingRenewals className="col-span-full" />
      </AnalyticsWidget>
    </DashboardLayout>
  );
}
