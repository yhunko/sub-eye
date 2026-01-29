import { Card, CardContent } from "@/shared/components";
import { DashboardLayout, DashboardNavbar } from "@/widgets/dashboard-layout";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(protected)/subscriptions/add")({
  component: AddSubscriptionPage,
});

function AddSubscriptionPage() {
  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <Card className="mx-auto max-w-screen-sm">
        <CardContent>
          ADD
          {/*<AddSubscriptionForm />*/}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
