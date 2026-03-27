import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useMemo, lazy } from "react";
import { useQueryStates } from "nuqs";
import { subscriptionsQueryParsers } from "@/entities/subscription";
import {
  demoSubscriptions,
  demoCategories,
  demoMonthlySpendSummary,
} from "@/shared/lib/demo/data";
import { filterSubscriptions } from "@/features/demo/lib/filter-subscriptions";
import { SubscriptionsMonthlySpendCard } from "@/features/analytics";
import { DemoSubscriptionRowActions } from "@/features/demo/ui/demo-subscription-row-actions";
import { useBreakpoint } from "@/shared/hooks/use-breakpoint";

export const Route = createFileRoute("/demo/subscriptions/")({
  component: DemoSubscriptionsPage,
});

const SubscriptionsTable = lazy(
  () =>
    import("@/features/subscription/subscriptions-table/subscriptions-table"),
);

const SubscriptionsListWidget = lazy(
  () =>
    import("@/features/subscription/subscriptions-list/subscriptions-list-widget"),
);

function DemoSubscriptionsPage() {
  const isDesktop = useBreakpoint("md");
  const [filters] = useQueryStates(subscriptionsQueryParsers, {
    history: "replace",
  });

  const filteredSubscriptions = useMemo(() => {
    return filterSubscriptions(demoSubscriptions, {
      search: filters.search,
      status: filters.status,
      categoryId: filters.categoryId,
      sortBy: filters.sortBy,
      direction: filters.direction,
    });
  }, [filters]);

  const monthlySpendSlot = (
    <SubscriptionsMonthlySpendCard data={demoMonthlySpendSummary} />
  );

  return (
    <Suspense
      fallback={<div className="bg-muted h-96 animate-pulse rounded-xl" />}
    >
      {isDesktop ? (
        <SubscriptionsTable
          subscriptions={filteredSubscriptions}
          categories={demoCategories}
          monthlySpendSlot={monthlySpendSlot}
          rowActions={DemoSubscriptionRowActions}
          enableBulkActions={false}
        />
      ) : (
        <SubscriptionsListWidget
          subscriptions={filteredSubscriptions}
          categories={demoCategories}
          monthlySpendSlot={monthlySpendSlot}
          disableLinks
        />
      )}
    </Suspense>
  );
}
