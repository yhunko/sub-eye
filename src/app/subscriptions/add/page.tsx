import { DashboardNavbar } from "@/features/dashboard";
import { DashboardLayout } from "@/features/dashboard/ui/dashboard.layout";
import { AddSubscriptionForm } from "@/features/add-subscription-form";

export default async function AddSubscriptionPage() {
  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <AddSubscriptionForm />
    </DashboardLayout>
  );
}
