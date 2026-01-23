"use client";

import { useBreakpoint } from "@/shared/hooks/use-breakpoint";
import dynamic from "next/dynamic";

const SubscriptionsTable = dynamic(
  () =>
    import("../../subscriptions-table").then((mod) => mod.SubscriptionsTable),
  { ssr: false },
);

const SubscriptionsList = dynamic(
  () => import("./subscriptions-list").then((mod) => mod.SubscriptionsList),
  { ssr: false },
);

export const SubscriptionsListWidget = () => {
  const isDesktop = useBreakpoint("md");

  return isDesktop ? <SubscriptionsTable /> : <SubscriptionsList />;
};
