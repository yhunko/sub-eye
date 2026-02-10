import { FC } from "react";
import { XCircle } from "lucide-react";
import { Button } from "@/shared/components";
import { SubscriptionDeleteButton } from "@/features/subscription/delete-subscription";
import * as m from "@/i18n/messages";

type SubscriptionOverviewActionsProps = {
  subscriptionId: string;
  subscriptionName?: string;
  onMarkAsCanceled: () => void;
  onDeleteSuccess: () => void;
};

export const SubscriptionOverviewActions: FC<
  SubscriptionOverviewActionsProps
> = ({
  subscriptionId,
  subscriptionName,
  onMarkAsCanceled,
  onDeleteSuccess,
}) => {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
      <Button size="lg" variant="outline" onClick={onMarkAsCanceled}>
        <XCircle className="mr-2 size-4" />
        {m.subscription_overview_markAsCanceled()}
      </Button>
      <SubscriptionDeleteButton
        subscriptionId={subscriptionId}
        fullWidth
        onSuccess={onDeleteSuccess}
        subscriptionName={subscriptionName}
      />
    </div>
  );
};
