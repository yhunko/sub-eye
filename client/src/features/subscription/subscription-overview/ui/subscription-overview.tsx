import { FC, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import NiceModal from "@ebay/nice-modal-react";

import { DateTimezoneUtils } from "shared";
import { subscriptionQuery } from "@/entities/subscription";

import { SubscriptionBillingUtils } from "../../billing/lib/subscription-billing-utils";
import { SubscriptionOverviewStats } from "./subscription-overview-stats";
import { SubscriptionOverviewHeader } from "./subscription-overview-header";
import { SubscriptionOverviewDetails } from "./subscription-overview-details";
import { SubscriptionOverviewActions } from "./subscription-overview-actions";
import { SubscriptionHistoryList } from "../../subscription-history";

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

  const handleDeleteSuccess = async () => {
    await navigate({ to: "/subscriptions" });
  };

  const handleOpenCancelDialog = async () => {
    const { SubscriptionCancelDialog } =
      await import("../../subscription-cancel-dialog");

    await NiceModal.show(SubscriptionCancelDialog, {
      subscriptionId,
      subscriptionName: subscription.name,
      defaultCancelledAt: subscription.nextPaymentDate,
    });
  };

  const handleOpenRenewDialog = async () => {
    const { SubscriptionRenewDialog } =
      await import("../../subscription-renew-dialog");

    await NiceModal.show(SubscriptionRenewDialog, {
      subscriptionId,
      subscriptionName: subscription.name,
    });
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <SubscriptionOverviewHeader subscription={subscription} />

      <SubscriptionOverviewStats subscriptionId={subscriptionId} />

      <SubscriptionOverviewDetails
        subscription={subscription}
        displayState={displayState}
      />

      <div className="w-full">
        <SubscriptionHistoryList subscriptionId={subscriptionId} />
      </div>

      <SubscriptionOverviewActions
        subscriptionId={subscriptionId}
        subscriptionName={subscription.name}
        onMarkAsCanceled={() => {
          void handleOpenCancelDialog();
        }}
        onRenew={() => {
          void handleOpenRenewDialog();
        }}
        onDeleteSuccess={handleDeleteSuccess}
        status={subscription.status}
      />
    </div>
  );
};
