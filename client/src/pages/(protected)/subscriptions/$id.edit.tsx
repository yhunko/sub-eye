import { AddSubscriptionForm } from "@/features/subscription/add-subscription";
import { Card, CardContent } from "@/shared/components";
import { DashboardLayout, DashboardNavbar } from "@/widgets/dashboard-layout";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(protected)/subscriptions/$id/edit")({
  component: EditSubscriptionPage,
});

function EditSubscriptionPage() {
  const { id } = Route.useParams();

  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <Card className="mx-auto max-w-screen-sm">
        <CardContent>
          <AddSubscriptionForm subscriptionId={id} />
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
