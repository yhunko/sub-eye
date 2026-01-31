import { useBreakpoint } from "@/shared/hooks/use-breakpoint";
import { lazyRouteComponent } from "@tanstack/react-router";

const SubscriptionsTable = lazyRouteComponent(
  () => import("../../features/subscription/subscriptions-table"),
);

const SubscriptionsListWidget = lazyRouteComponent(
  () => import("../../features/subscription/subscriptions-list"),
);

export const SubscriptionsWidget = () => {
  const isDesktop = useBreakpoint("md");

  if (isDesktop) {
    return <SubscriptionsTable />;
  }

  return <SubscriptionsListWidget />;
};
