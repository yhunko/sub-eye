import { createFileRoute } from "@tanstack/react-router";
import { SubscriptionNativeLayout } from "@/widgets/subscription-native-layout";
import { Suspense } from "react";
import {
  SubscriptionOverview,
  SubscriptionOverviewSkeleton,
} from "@/features/subscription/subscription-overview";
import { valibotValidator } from "@tanstack/valibot-adapter";
import { subscriptionOverviewSearchSchema } from "@/shared/lib/router/subscription-overview-search";

export const Route = createFileRoute("/(protected)/subscriptions/$id/")({
  component: SubscriptionPage,
  validateSearch: valibotValidator(subscriptionOverviewSearchSchema),
});

// eslint-disable-next-line react-refresh/only-export-components
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
