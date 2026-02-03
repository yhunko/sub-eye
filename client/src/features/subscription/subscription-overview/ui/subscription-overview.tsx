import { FC, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, useUser } from "@clerk/clerk-react";
import { toast } from "sonner";
import { useSuspenseQuery } from "@tanstack/react-query";

import { DateTimezoneUtils } from "@shared/utils/dateTimezoneUtils";
import { subscriptionQuery } from "@/entities/subscription";
import * as m from "@/i18n/messages";

import { SubscriptionBillingUtils } from "../../billing/lib/subscription-billing-utils";
import { SubscriptionOverviewStats } from "./subscription-overview-stats";
import { SubscriptionOverviewHeader } from "./subscription-overview-header";
import { SubscriptionOverviewDetails } from "./subscription-overview-details";
import { SubscriptionOverviewActions } from "./subscription-overview-actions";

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

  const handleDeleteSuccess = async () => {
    await navigate({ to: "/subscriptions" });
  };

  const handleMarkAsCanceled = () => {
    toast.info(m.subscription_overview_markAsCanceledComingSoon());
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
        onMarkAsCanceled={handleMarkAsCanceled}
        onDeleteSuccess={handleDeleteSuccess}
      />
    </div>
  );
};
