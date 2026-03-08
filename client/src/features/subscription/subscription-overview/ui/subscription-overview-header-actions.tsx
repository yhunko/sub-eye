import { FC } from "react";
import type { SubscriptionDto } from "shared";
import { SubscriptionOverviewActionsDropdown } from "./subscription-overview-actions-dropdown";
import { SubscriptionOverviewStatusSelector } from "./subscription-overview-status-selector";
import * as m from "@/i18n/messages";
import { ChevronLeft } from "lucide-react";
import { Button } from "../../../../shared/components";

type SubscriptionOverviewHeaderActionsProps = {
  subscriptionId: string;
  subscriptionName: string;
  hasScheduledPriceChange: boolean;
  onSchedulePriceChange: () => void;
  onDeleteSuccess: () => Promise<void> | void;
  status: SubscriptionDto["status"];
  onMarkAsCanceled: () => void;
  onRenew: () => void;
  onBack: () => void;
};

export const SubscriptionOverviewHeaderActions: FC<
  SubscriptionOverviewHeaderActionsProps
> = ({
  subscriptionId,
  subscriptionName,
  hasScheduledPriceChange,
  onSchedulePriceChange,
  onDeleteSuccess,
  status,
  onMarkAsCanceled,
  onRenew,
  onBack,
}) => {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="size-11 rounded-full shadow-sm"
          onClick={onBack}
          aria-label={m.subscription_overview_back()}
        >
          <ChevronLeft className="size-4" aria-hidden />
          <span className="sr-only">{m.subscription_overview_back()}</span>
        </Button>
        <SubscriptionOverviewStatusSelector
          status={status}
          onMarkAsCanceled={onMarkAsCanceled}
          onRenew={onRenew}
        />
      </div>

      <SubscriptionOverviewActionsDropdown
        subscriptionId={subscriptionId}
        subscriptionName={subscriptionName}
        hasScheduledPriceChange={hasScheduledPriceChange}
        onSchedulePriceChange={onSchedulePriceChange}
        onDeleteSuccess={onDeleteSuccess}
      />
    </div>
  );
};
