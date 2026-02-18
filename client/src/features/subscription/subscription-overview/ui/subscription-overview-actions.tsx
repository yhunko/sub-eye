import { FC } from "react";
import { RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/shared/components";
import { SubscriptionDeleteButton } from "@/features/subscription/delete-subscription";
import { SubscriptionDto } from "@shared/domains/subscription";
import * as m from "@/i18n/messages";

type SubscriptionOverviewActionsProps = {
  subscriptionId: string;
  subscriptionName?: string;
  onMarkAsCanceled: () => void;
  onRenew: () => void;
  onDeleteSuccess: () => void;
  status: SubscriptionDto["status"];
};

export const SubscriptionOverviewActions: FC<
  SubscriptionOverviewActionsProps
> = ({
  subscriptionId,
  subscriptionName,
  onMarkAsCanceled,
  onRenew,
  onDeleteSuccess,
  status,
}) => {
  const isActive = status === "active";
  const isCancelled = status === "cancelled";

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
      {isActive && (
        <Button size="lg" variant="outline" onClick={onMarkAsCanceled}>
          <XCircle className="mr-2 size-4" />
          {m.subscription_overview_markAsCanceled()}
        </Button>
      )}
      {isCancelled && (
        <Button size="lg" onClick={onRenew}>
          <RotateCcw className="mr-2 size-4" />
          {m.subscription_overview_markAsRenewed()}
        </Button>
      )}
      <SubscriptionDeleteButton
        subscriptionId={subscriptionId}
        fullWidth
        onSuccess={onDeleteSuccess}
        subscriptionName={subscriptionName}
      />
    </div>
  );
};
