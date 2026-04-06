import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import type { MonthlySpendSummaryDto } from "shared";
import { monthlySpendSummaryQuery } from "@/entities/analytics";
import { useActiveSpace } from "@/shared/lib/org/use-active-space";
import { SubscriptionsMonthlySpendCard } from "./subscriptions-monthly-spend-card";

const EMPTY_MONTHLY_SPEND_SUMMARY: MonthlySpendSummaryDto = {
  currencyCode: "USD",
  currentMonthTotal: 0,
  previousMonthTotal: 0,
  deltaPercentage: null,
  trend: [],
};

export const SubscriptionsMonthlySpendCardConnected = () => {
  const { userId } = useAuth();
  const { orgId } = useActiveSpace();

  const { data, isLoading } = useQuery(
    monthlySpendSummaryQuery({ userId: userId!, orgId }),
  );

  return (
    <SubscriptionsMonthlySpendCard
      data={data ?? EMPTY_MONTHLY_SPEND_SUMMARY}
      isLoading={!data && isLoading}
    />
  );
};
