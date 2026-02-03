import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout, DashboardNavbar } from "@/widgets/dashboard-layout";
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
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        <Suspense fallback={<SubscriptionOverviewSkeleton />}>
          <SubscriptionOverview subscriptionId={id} />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}
