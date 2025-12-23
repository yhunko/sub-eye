import { DashboardNavbar, DashboardLayout } from "@/features/dashboard";
import { getQueryClient } from "@/shared/lib/react-query";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { SubscriptionsTable } from "@/features/subscriptions-table";
import { AddSubscriptionButton } from "@/features/subscription";

export default async function Home() {
  const queryClient = getQueryClient();

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
