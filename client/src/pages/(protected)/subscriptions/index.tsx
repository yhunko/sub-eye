import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout, DashboardNavbar } from "@/widgets/dashboard-layout";
import { SubscriptionsWidget } from "@/widgets/subscriptions-widget";
import { NuqsAdapter } from "nuqs/adapters/react";

export const Route = createFileRoute("/(protected)/subscriptions/")({
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  return (
    <DashboardLayout Navbar={<DashboardNavbar />}>
      <NuqsAdapter>
        <SubscriptionsWidget />
      </NuqsAdapter>
    </DashboardLayout>
  );
}
