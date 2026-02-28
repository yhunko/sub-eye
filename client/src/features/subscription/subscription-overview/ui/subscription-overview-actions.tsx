import { FC } from "react";
import { RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/shared/components";
import { SubscriptionDeleteButton } from "@/features/subscription/delete-subscription";
import { SubscriptionDto } from "shared";
import * as m from "@/i18n/messages";
import { SubscriptionHistoryTimelineTrigger } from "../../subscription-history";
import { cn } from "@/shared/lib/classes-utils";

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
  const showStatusAction = isActive || isCancelled;

  return (
    <div className="flex flex-col gap-3">
      <SubscriptionHistoryTimelineTrigger subscriptionId={subscriptionId} />

      <div
        className={cn(
          "grid grid-cols-1 gap-3",
          showStatusAction && "md:grid-cols-2",
        )}
      >
        {showStatusAction && (
          <>
            {isActive && (
              <Button
                size="lg"
                variant="outline"
                onClick={onMarkAsCanceled}
                className="h-11 rounded-xl"
              >
                <XCircle className="mr-2 size-4" aria-hidden />
                {m.subscription_overview_markAsCanceled()}
              </Button>
            )}
            {isCancelled && (
              <Button size="lg" onClick={onRenew} className="h-11 rounded-xl">
                <RotateCcw className="mr-2 size-4" aria-hidden />
                {m.subscription_overview_markAsRenewed()}
              </Button>
            )}
          </>
        )}

        <SubscriptionDeleteButton
          subscriptionId={subscriptionId}
          fullWidth
          onSuccess={onDeleteSuccess}
          subscriptionName={subscriptionName}
          className="h-11 rounded-xl"
        />
      </div>
    </div>
  );
};
