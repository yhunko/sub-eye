import { FC } from "react";
import { SubscriptionNextBill } from "../../billing";
import { SubscriptionDto } from "shared";
import * as m from "@/i18n/messages";

type SubscriptionListStatusProps = {
  subscription: SubscriptionDto;
};

export const SubscriptionListStatus: FC<SubscriptionListStatusProps> = ({
  subscription,
}) => {
  const isCancelled = subscription.status === "cancelled";
  const isCancelledButActive = subscription.status === "cancelledButActive";

  return (
    <div className="text-muted-foreground flex items-center gap-1 text-sm">
      {isCancelled ? (
        <span className="text-destructive font-medium">
          {m.subscription_status_cancelled()}
        </span>
      ) : isCancelledButActive ? (
        <>
          <span className="font-medium">
            {m.subscription_status_cancelledButActive()}
          </span>
          {subscription.willBeCancelledAt && (
            <SubscriptionNextBill
              nextBillDate={subscription.willBeCancelledAt}
              format="short"
            />
          )}
        </>
      ) : (
        <SubscriptionNextBill
          nextBillDate={subscription.nextPaymentDate}
          format="short"
        />
      )}
    </div>
  );
};
