import { FC } from "react";
import { ChevronLeft } from "lucide-react";
import { SubscriptionDto } from "shared";
import { Button } from "@/shared/components";
import { SubscriptionOverviewActionsDropdown } from "./subscription-overview-actions-dropdown";
import * as m from "@/i18n/messages";

type SubscriptionOverviewHeaderActionsProps = {
  subscriptionId: string;
  subscriptionName: string;
  status: SubscriptionDto["status"];
  onMarkAsCanceled: () => void;
  onRenew: () => void;
  onDeleteSuccess: () => Promise<void> | void;
  onBack: () => Promise<void> | void;
};

export const SubscriptionOverviewHeaderActions: FC<
  SubscriptionOverviewHeaderActionsProps
> = ({
  subscriptionId,
  subscriptionName,
  status,
  onMarkAsCanceled,
  onRenew,
  onDeleteSuccess,
  onBack,
}) => {
  return (
    <div className="flex items-center justify-between gap-3">
      <Button
        variant="outline"
        className="h-11 rounded-full px-4"
        onClick={() => {
          void onBack();
        }}
        aria-label={m.subscription_overview_back()}
      >
        <ChevronLeft className="size-4" aria-hidden />
        {m.subscription_overview_back()}
      </Button>

      <SubscriptionOverviewActionsDropdown
        subscriptionId={subscriptionId}
        subscriptionName={subscriptionName}
        status={status}
        onMarkAsCanceled={onMarkAsCanceled}
        onRenew={onRenew}
        onDeleteSuccess={onDeleteSuccess}
      />
    </div>
  );
};
