import { useBreakpoint } from "@/shared/hooks/use-breakpoint";
import { lazy, Suspense } from "react";

const SubscriptionsTable = lazy(
  () => import("../../features/subscription/subscriptions-table"),
);

const SubscriptionsListWidget = lazy(
  () => import("../../features/subscription/subscriptions-list"),
);

export const SubscriptionsWidget = () => {
  const isDesktop = useBreakpoint("md");

  if (isDesktop) {
    return (
      <Suspense>
        <SubscriptionsTable />
      </Suspense>
    );
  }

  return (
    <Suspense>
      <SubscriptionsListWidget />
    </Suspense>
  );
};
