import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { monthlySpendSummaryQuery } from "@/entities/analytics";
import { useActiveSpace } from "@/shared/lib/org/use-active-space";
import { SubscriptionsMonthlySpendCard } from "./subscriptions-monthly-spend-card";

export const SubscriptionsMonthlySpendCardConnected = () => {
  const { userId } = useAuth();
  const { orgId } = useActiveSpace();

  const { data, isLoading } = useQuery(
    monthlySpendSummaryQuery({ userId: userId!, orgId }),
  );

  if (!data) return null;

  return <SubscriptionsMonthlySpendCard data={data} isLoading={isLoading} />;
};
