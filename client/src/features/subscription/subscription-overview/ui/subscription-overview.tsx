import { FC, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, useUser } from "@clerk/clerk-react";
import { toast } from "sonner";
import { useSuspenseQuery } from "@tanstack/react-query";

import { DateTimezoneUtils } from "@shared/utils/dateTimezoneUtils";
import {
  subscriptionQuery,
  useCancelSubscription,
} from "@/entities/subscription";
import * as m from "@/i18n/messages";

import { SubscriptionBillingUtils } from "../../billing/lib/subscription-billing-utils";
import { SubscriptionOverviewStats } from "./subscription-overview-stats";
import { SubscriptionOverviewHeader } from "./subscription-overview-header";
import { SubscriptionOverviewDetails } from "./subscription-overview-details";
import { SubscriptionOverviewActions } from "./subscription-overview-actions";
import { SubscriptionCancelDialog } from "../../subscription-cancel-dialog";

type SubscriptionOverviewProps = {
  subscriptionId: string;
};

export const SubscriptionOverview: FC<SubscriptionOverviewProps> = ({
  subscriptionId,
}) => {
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const { userId } = useAuth();

  const { data: subscription } = useSuspenseQuery(
    subscriptionQuery({
      params: { id: subscriptionId, userId: userId ?? "" },
    }),
  );

  const displayState = useMemo(() => {
    if (!subscription || !isLoaded) return null;

    const timezone = user?.publicMetadata?.preferredTimezone as
      | string
      | undefined;

    const zonedDate = DateTimezoneUtils.toZoned(
      subscription.nextPaymentDate,
      timezone,
    );

    return SubscriptionBillingUtils.toDisplayState(zonedDate, timezone);
  }, [subscription, isLoaded, user?.publicMetadata?.preferredTimezone]);

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const { mutate: cancelSubscription } = useCancelSubscription();

  const handleDeleteSuccess = async () => {
    await navigate({ to: "/subscriptions" });
  };

  const handleConfirmCancel = () => {
    cancelSubscription(
      { id: subscriptionId },
      {
        onSuccess: () => {
          setIsCancelDialogOpen(false);
          toast.success(m.messages_updated());
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <SubscriptionOverviewHeader subscription={subscription} />

      <SubscriptionOverviewStats subscriptionId={subscriptionId} />

      <SubscriptionOverviewDetails
        subscription={subscription}
        displayState={displayState}
      />

      <SubscriptionOverviewActions
        subscriptionId={subscriptionId}
        subscriptionName={subscription.name}
        onMarkAsCanceled={() => setIsCancelDialogOpen(true)}
        onDeleteSuccess={handleDeleteSuccess}
        isCancelled={!!subscription.cancelledAt}
      />

      <SubscriptionCancelDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        onConfirm={handleConfirmCancel}
        subscriptionName={subscription.name}
        nextPaymentDate={subscription.nextPaymentDate}
      />
    </div>
  );
};
