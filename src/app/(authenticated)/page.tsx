import { DashboardNavbar, DashboardLayout } from "@/features/dashboard";
import { subscriptionsQueryKeys } from "@/entities/subscription";
import { getQueryClient } from "@/shared/lib/react-query";
import { dehydrate } from "@tanstack/query-core";
import { HydrationBoundary } from "@tanstack/react-query";
import { SubscriptionsTable } from "@/features/subscriptions-table";
import { getSubscriptionsAction } from "@/entities/subscription/api/actions";
import { monobankQueryKeys } from "@/entities/monobank/api/hooks";
import { getCurrenciesAction } from "@/entities/monobank/api/actions";
import { AddSubscriptionButton } from "@/features/subscription";

export default async function Home() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: subscriptionsQueryKeys.list.queryKey,
    queryFn: getSubscriptionsAction,
  });

  await queryClient.prefetchQuery({
    queryKey: monobankQueryKeys.currencies.queryKey,
    queryFn: getCurrenciesAction,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardLayout Navbar={<DashboardNavbar />}>
        <main>
          <SubscriptionsTable />
        </main>
      </DashboardLayout>

      <AddSubscriptionButton />
    </HydrationBoundary>
  );
}
