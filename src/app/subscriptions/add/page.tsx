import { DashboardNavbar } from "@/features/dashboard";
import { DashboardLayout } from "@/features/dashboard/ui/dashboard.layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components";
import { AddSubscriptionForm } from "@/features/subscription";

export default async function AddSubscriptionPage() {
  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <Card className="mx-auto max-w-screen-sm">
        <CardHeader>
          <CardTitle>Add subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <AddSubscriptionForm />
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
