"use client";

import { FC } from "react";
import {
  CashFlowChart,
  AnalyticsWidget,
  UpcomingRenewals,
  StatCards,
  MonthlySpendingTrendChart,
} from "@/features/analytics";

export const DashboardClient: FC = () => {
  return (
    <AnalyticsWidget>
      <StatCards className="col-span-full" />
      <CashFlowChart />
      <UpcomingRenewals />
      <MonthlySpendingTrendChart className="col-span-full" />
    </AnalyticsWidget>
  );
};
