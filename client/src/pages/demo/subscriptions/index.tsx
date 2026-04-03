import { createFileRoute } from "@tanstack/react-router";
import { useQueryStates } from "nuqs";
import { lazy, Suspense, useMemo } from "react";
import { subscriptionsQueryParsers } from "@/entities/subscription";
import { SubscriptionsMonthlySpendCard } from "@/features/analytics";
import { filterSubscriptions } from "@/features/demo/lib/filter-subscriptions";
import { DemoSubscriptionRowActions } from "@/features/demo/ui/demo-subscription-row-actions";
import { useBreakpoint } from "@/shared/hooks/use-breakpoint";
import {
  demoCategories,
  demoMonthlySpendSummary,
  demoSubscriptions,
} from "@/shared/lib/demo/data";

export const Route = createFileRoute("/demo/subscriptions/")({
  component: DemoSubscriptionsPage,
});

const SubscriptionsTable = lazy(
  () =>
    import("@/features/subscription/subscriptions-table/subscriptions-table"),
);

const SubscriptionsListWidget = lazy(
  () =>
    import(
      "@/features/subscription/subscriptions-list/subscriptions-list-widget"
    ),
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
