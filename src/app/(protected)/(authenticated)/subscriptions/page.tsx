import { DashboardLayout, DashboardNavbar } from "@/features/dashboard";
import { SubscriptionsTable } from "@/features/subscriptions-table";

export default async function SubscriptionsPage() {
  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <SubscriptionsTable />
    </DashboardLayout>
  );
}
