import { createFileRoute } from "@tanstack/react-router";
import { SubscriptionNativeLayout } from "@/widgets/subscription-native-layout";
import { Suspense } from "react";
import {
  SubscriptionOverview,
  SubscriptionOverviewSkeleton,
} from "@/features/subscription/subscription-overview";

export const Route = createFileRoute("/(protected)/subscriptions/$id/")({
  component: SubscriptionPage,
});

function SubscriptionPage() {
  const { id } = Route.useParams();

  return (
    <SubscriptionNativeLayout surface="plain">
      <div className="flex w-full flex-1 flex-col">
        <Suspense fallback={<SubscriptionOverviewSkeleton />}>
          <SubscriptionOverview subscriptionId={id} />
        </Suspense>
      </div>
    </SubscriptionNativeLayout>
  );
}
