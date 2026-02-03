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
    <div className="flex flex-col gap-3 md:flex-row md:gap-4">
      <Button
        className="grow"
        size="lg"
        variant="outline"
        onClick={onMarkAsCanceled}
      >
        <XCircle className="mr-2 size-4" />
        {m.subscription_overview_markAsCanceled()}
      </Button>
      <SubscriptionDeleteButton
        subscriptionId={subscriptionId}
        buttonClassName="grow"
        fullWidth
        onSuccess={onDeleteSuccess}
        subscriptionName={subscriptionName}
      />
    </div>
  );
};
