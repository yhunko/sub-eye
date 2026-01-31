import { useBreakpoint } from "@/shared/hooks/use-breakpoint";
import { lazy, Suspense } from "react";
import { Spinner } from "@/shared/components";

const SubscriptionsTable = lazy(
  () => import("../../features/subscription/subscriptions-table"),
);

const SubscriptionsListWidget = lazy(
  () => import("../../features/subscription/subscriptions-list"),
);

export const SubscriptionsWidget = () => {
  const isDesktop = useBreakpoint("md");

  return (
    <Suspense fallback={<Spinner className="mx-auto" />}>
      {isDesktop ? <SubscriptionsTable /> : <SubscriptionsListWidget />}
    </Suspense>
  );
};
