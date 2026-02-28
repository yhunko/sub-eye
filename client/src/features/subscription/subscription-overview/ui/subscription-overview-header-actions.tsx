import { FC } from "react";
import type { SubscriptionDto } from "shared";
import { SubscriptionOverviewActionsDropdown } from "./subscription-overview-actions-dropdown";
import { SubscriptionOverviewStatusSelector } from "./subscription-overview-status-selector";

type SubscriptionOverviewHeaderActionsProps = {
  subscriptionId: string;
  subscriptionName: string;
  onDeleteSuccess: () => Promise<void> | void;
  status: SubscriptionDto["status"];
  onMarkAsCanceled: () => void;
  onRenew: () => void;
};

export const SubscriptionOverviewHeaderActions: FC<
  SubscriptionOverviewHeaderActionsProps
> = ({
  subscriptionId,
  subscriptionName,
  onDeleteSuccess,
  status,
  onMarkAsCanceled,
  onRenew,
}) => {
  return (
    <div className="flex items-center justify-between gap-3">
      <SubscriptionOverviewStatusSelector
        status={status}
        onMarkAsCanceled={onMarkAsCanceled}
        onRenew={onRenew}
      />

      <SubscriptionOverviewActionsDropdown
        subscriptionId={subscriptionId}
        subscriptionName={subscriptionName}
        onDeleteSuccess={onDeleteSuccess}
      />
    </div>
  );
};
