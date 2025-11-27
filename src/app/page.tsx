import { DashboardNavbar, DashboardLayout } from "@/features/dashboard";
import { subscriptionsQueryKeys } from "@/entities/subscription";
import { getQueryClient } from "@/shared/lib/react-query";
import { getSubscriptions } from "@/entities/subscription/api/actions";
import { dehydrate } from "@tanstack/query-core";
import { HydrationBoundary } from "@tanstack/react-query";
import { AddSubscriptionButton } from "@/features/add-subscription-button";
import { SubscriptionsTable } from "@/features/subscriptions-table";

export default async function Home() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: subscriptionsQueryKeys.list.queryKey,
    queryFn: getSubscriptions,
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
