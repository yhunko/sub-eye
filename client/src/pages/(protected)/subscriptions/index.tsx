import { createFileRoute } from "@tanstack/react-router";
import {
  DashboardLayout,
  DashboardNavbar,
} from "../../../widgets/dashboard-layout";
import { SubscriptionsTable } from "@/features/subscription/subscriptions-table";

export const Route = createFileRoute("/(protected)/subscriptions/")({
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <SubscriptionsTable />
    </DashboardLayout>
  );
}
