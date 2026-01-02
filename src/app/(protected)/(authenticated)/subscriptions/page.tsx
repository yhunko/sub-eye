import { DashboardLayout, DashboardNavbar } from "@/features/dashboard";
import { SubscriptionsListWidget } from "@/features/subscription/ui/subscriptions-list-widget";

export default async function SubscriptionsPage() {
  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <SubscriptionsListWidget />
    </DashboardLayout>
  );
}
