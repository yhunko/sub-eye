import { DashboardNavbar } from "@/features/dashboard";
import { DashboardLayout } from "@/features/dashboard/ui/dashboard.layout";
import { Card, CardContent } from "@/shared/components";
import { EditSubscriptionForm } from "@/features/subscription";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/shared/lib/react-query";
import {
  subscriptionsQueryKeys,
  GetSubscriptionParams,
} from "@/entities/subscription";
import { auth } from "@clerk/nextjs/server";
import { getSubscriptionAction } from "@/entities/subscription/api/actions";

type EditSubscriptionPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SubscriptionEditPage({
  params,
}: EditSubscriptionPageProps) {
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
      <Card className="mx-auto max-w-screen-sm">
        <CardContent>
          <HydrationBoundary state={dehydrate(queryClient)}>
            <EditSubscriptionForm subscriptionId={id} />
          </HydrationBoundary>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
