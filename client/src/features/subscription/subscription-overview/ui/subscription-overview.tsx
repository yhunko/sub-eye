import { FC, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, useUser } from "@clerk/clerk-react";
import { toast } from "sonner";
import { useSuspenseQuery } from "@tanstack/react-query";

import { DateTimezoneUtils } from "@shared/utils/dateTimezoneUtils";
import {
  subscriptionQuery,
  useUpdateSubscription,
} from "@/entities/subscription";
import * as m from "@/i18n/messages";

import { SubscriptionBillingUtils } from "../../billing/lib/subscription-billing-utils";
import { SubscriptionOverviewStats } from "./subscription-overview-stats";
import { SubscriptionOverviewHeader } from "./subscription-overview-header";
import { SubscriptionOverviewDetails } from "./subscription-overview-details";
import { SubscriptionOverviewActions } from "./subscription-overview-actions";
import { SubscriptionCancelDialog } from "../../subscription-cancel-dialog";
import { SubscriptionRenewDialog } from "../../subscription-renew-dialog";

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

    const targetDate =
      subscription.status === "cancelledButActive" &&
      subscription.willBeCancelledAt
        ? subscription.willBeCancelledAt
        : subscription.status === "cancelled" && subscription.willBeCancelledAt
          ? subscription.willBeCancelledAt
          : subscription.nextPaymentDate;

    const zonedDate = DateTimezoneUtils.toZoned(targetDate, timezone);

    return SubscriptionBillingUtils.toDisplayState(zonedDate, timezone);
  }, [subscription, isLoaded, user?.publicMetadata?.preferredTimezone]);

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isRenewDialogOpen, setIsRenewDialogOpen] = useState(false);
  const { mutate: updateSubscription, isPending: isUpdatePending } =
    useUpdateSubscription();

  const handleDeleteSuccess = async () => {
    await navigate({ to: "/subscriptions" });
  };

  const handleConfirmCancel = (cancelledAtIso: string) => {
    updateSubscription(
      {
        id: subscriptionId,
        payload: {
          willBeCancelledAt: cancelledAtIso,
        },
      },
      {
        onSuccess: () => {
          setIsCancelDialogOpen(false);
          toast.success(m.messages_updated());
        },
      },
    );
  };

  const handleConfirmRenew = (renewalDateIso: string) => {
    updateSubscription(
      {
        id: subscriptionId,
        payload: {
          paymentDate: renewalDateIso,
          willBeCancelledAt: null,
        },
      },
      {
        onSuccess: () => {
          setIsRenewDialogOpen(false);
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
        onRenew={() => setIsRenewDialogOpen(true)}
        onDeleteSuccess={handleDeleteSuccess}
        status={subscription.status}
      />

      <SubscriptionCancelDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        onConfirm={handleConfirmCancel}
        subscriptionName={subscription.name}
        defaultCancelledAt={subscription.nextPaymentDate}
        pending={isUpdatePending}
      />

      <SubscriptionRenewDialog
        open={isRenewDialogOpen}
        onOpenChange={setIsRenewDialogOpen}
        onConfirm={handleConfirmRenew}
        subscriptionName={subscription.name}
        pending={isUpdatePending}
      />
    </div>
  );
};
