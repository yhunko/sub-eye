import { DashboardNavbar } from "@/features/dashboard";
import { DashboardLayout } from "@/features/dashboard/ui/dashboard.layout";
import { SubscriptionOverview } from "@/features/subscription";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/shared/lib/react-query";
import {
  subscriptionsQueryKeys,
  GetSubscriptionParams,
} from "@/entities/subscription";
import { auth } from "@clerk/nextjs/server";
import { getSubscriptionAction } from "@/entities/subscription/api/actions";

type SubscriptionPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SubscriptionPage({
  params,
}: SubscriptionPageProps) {
  const { id } = await params;

  const { userId } = await auth();
  const queryClient = getQueryClient();

  if (userId) {
    const getSubscriptionParams: GetSubscriptionParams = {
      id,
    };

    const subscription = await getSubscriptionAction(getSubscriptionParams);
    queryClient.setQueryData(
      subscriptionsQueryKeys.user(userId)._ctx.detail(getSubscriptionParams)
        .queryKey,
      subscription,
    );
  }

  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        <HydrationBoundary state={dehydrate(queryClient)}>
          <SubscriptionOverview subscriptionId={id} />
        </HydrationBoundary>
      </div>
    </DashboardLayout>
  );
}
