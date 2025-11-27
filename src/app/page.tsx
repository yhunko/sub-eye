import { DashboardNavbar } from "@/features/dashboard";
import { subscriptionsQueryKeys } from "@/entities/subscription";
import { getQueryClient } from "@/shared/lib/react-query";
import { getSubscriptions } from "@/entities/subscription/api/actions";
import { dehydrate } from "@tanstack/query-core";
import { HydrationBoundary } from "@tanstack/react-query";

export default async function Home() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: subscriptionsQueryKeys.list.queryKey,
    queryFn: getSubscriptions,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="">
        <DashboardNavbar />
        <main>TEST</main>
      </div>
    </HydrationBoundary>
  );
}
