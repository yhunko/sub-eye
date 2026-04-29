import { createFileRoute } from "@tanstack/react-router";
import { NuqsAdapter } from "nuqs/adapters/react";
import { categoriesQuery } from "@/entities/category";
import { subscriptionsQuery } from "@/entities/subscription";
import { DashboardLayout, DashboardNavbar } from "@/widgets/dashboard-layout";
import { SubscriptionsWidget } from "@/widgets/subscriptions-widget";

export const Route = createFileRoute("/(protected)/subscriptions/")({
  loader: ({ context }) => {
    const userId = context.auth.userId;

    if (!userId) return;

    const orgId = context.auth.orgId ?? null;

    void context.queryClient.prefetchQuery(
      subscriptionsQuery({ params: { userId, orgId } }),
    );
    void context.queryClient.prefetchQuery(
      categoriesQuery({ params: { userId, orgId } }),
    );
    void import("@/features/subscription/subscriptions-list");
  },
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
