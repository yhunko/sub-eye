import { headers } from "next/headers";
import { userAgent } from "next/server";
import { SubscriptionsTable } from "../../subscriptions-table";
import { SubscriptionsList } from "./subscriptions-list";

export const SubscriptionsListWidget = async () => {
  const { device } = userAgent({ headers: await headers() });

  const isMobile = device?.type === "mobile";

  return isMobile ? <SubscriptionsList /> : <SubscriptionsTable />;
};
