import { createFileRoute } from "@tanstack/react-router";
import { NuqsAdapter } from "nuqs/adapters/react";
import { DashboardLayout, DashboardNavbar } from "@/widgets/dashboard-layout";
import { SubscriptionsWidget } from "@/widgets/subscriptions-widget";

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
