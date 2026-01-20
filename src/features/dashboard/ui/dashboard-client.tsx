"use client";

import { FC } from "react";
import { DashboardNavbar, DashboardLayout } from "@/features/dashboard";
import {
  CashFlowChart,
  AnalyticsWidget,
  UpcomingRenewals,
  StatCards,
  MonthlySpendingTrendChart,
} from "@/features/analytics";

export const DashboardClient: FC = () => {
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
};
