import { ChevronLeft } from "lucide-react";
import type { FC } from "react";
import * as m from "@/i18n/messages";
import { Button } from "../../../../shared/components";
import { SubscriptionOverviewActionsDropdown } from "./subscription-overview-actions-dropdown";

type SubscriptionOverviewHeaderActionsProps = {
  subscriptionId: string;
  subscriptionName: string;
  onDeleteSuccess: () => Promise<void> | void;
  onBack: () => void;
};

export const SubscriptionOverviewHeaderActions: FC<
  SubscriptionOverviewHeaderActionsProps
> = ({ subscriptionId, subscriptionName, onDeleteSuccess, onBack }) => {
  return (
    <div className="flex items-center justify-between gap-3">
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

      <SubscriptionOverviewActionsDropdown
        subscriptionId={subscriptionId}
        subscriptionName={subscriptionName}
        onDeleteSuccess={onDeleteSuccess}
      />
    </div>
  );
};
