import { createFileRoute } from "@tanstack/react-router";
import { valibotValidator } from "@tanstack/valibot-adapter";
import { Suspense } from "react";
import {
  SubscriptionOverview,
  SubscriptionOverviewSkeleton,
} from "@/features/subscription/subscription-overview";
import { subscriptionOverviewSearchSchema } from "@/shared/lib/router/subscription-overview-search";
import { SubscriptionNativeLayout } from "@/widgets/subscription-native-layout";

export const Route = createFileRoute("/(protected)/subscriptions/$id/")({
  component: SubscriptionPage,
  validateSearch: valibotValidator(subscriptionOverviewSearchSchema),
});

function SubscriptionPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();

  return (
    <SubscriptionNativeLayout surface="plain">
      <div className="flex w-full flex-1 flex-col">
        <Suspense fallback={<SubscriptionOverviewSkeleton />}>
          <SubscriptionOverview subscriptionId={id} returnSearch={search} />
        </Suspense>
      </div>
    </SubscriptionNativeLayout>
  );
}
