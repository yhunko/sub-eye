import { SubscriptionsTable } from "../../subscriptions-table";
import { SubscriptionsList } from "./subscriptions-list";

export const SubscriptionsListWidget = () => {
  return (
    <>
      <div className="hidden md:block">
        <SubscriptionsTable />
      </div>
      <div className="block md:hidden">
        <SubscriptionsList />
      </div>
    </>
  );
};
