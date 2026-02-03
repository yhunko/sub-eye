import { createFileRoute } from "@tanstack/react-router";
import { SubscriptionOverview } from "@/features/subscription/subscription-overview";
import { DashboardLayout, DashboardNavbar } from "@/widgets/dashboard-layout";

export const Route = createFileRoute("/(protected)/subscriptions/$id")({
  component: SubscriptionPage,
});

function SubscriptionPage() {
  const { id } = Route.useParams();

  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        <SubscriptionOverview subscriptionId={id} />
      </div>
    </DashboardLayout>
  );
}
