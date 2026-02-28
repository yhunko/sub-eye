import { FC, useMemo } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import NiceModal from "@ebay/nice-modal-react";

import { DateTimezoneUtils } from "shared";
import { subscriptionQuery } from "@/entities/subscription";
import { SubscriptionBillingUtils } from "../../billing/lib/subscription-billing-utils";
import { buildSubscriptionOverviewViewModel } from "../model/subscription-overview-view-model";
import { SubscriptionOverviewHeaderActions } from "./subscription-overview-header-actions";
import { SubscriptionOverviewSummaryCard } from "./subscription-overview-summary-card";
import { SubscriptionOverviewMetaList } from "./subscription-overview-meta-list";

type SubscriptionOverviewProps = {
  subscriptionId: string;
};

export const SubscriptionOverview: FC<SubscriptionOverviewProps> = ({
  subscriptionId,
}) => {
  const navigate = useNavigate();
  const router = useRouter();
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

  const viewModel = useMemo(
    () => buildSubscriptionOverviewViewModel(subscription, displayState),
    [displayState, subscription],
  );

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

  const handleBack = async () => {
    if (window.history.length > 1) {
      router.history.back();
      return;
    }

    await navigate({ to: "/subscriptions" });
  };

  return (
    <div className="flex h-full w-full flex-col p-3 md:p-6">
      <div className="flex flex-1 flex-col gap-4">
        <section className="rounded-[1.75rem] border p-4 shadow-sm md:p-6">
          <div className="flex flex-col gap-6">
            <SubscriptionOverviewHeaderActions
              subscriptionId={subscription.id}
              subscriptionName={subscription.name}
              status={subscription.status}
              onMarkAsCanceled={() => {
                void handleOpenCancelDialog();
              }}
              onRenew={() => {
                void handleOpenRenewDialog();
              }}
              onDeleteSuccess={handleDeleteSuccess}
              onBack={handleBack}
            />

            <SubscriptionOverviewSummaryCard
              subscription={subscription}
              statusPill={viewModel.statusPill}
            />

            <SubscriptionOverviewMetaList rows={viewModel.metaRows} />
          </div>
        </section>
      </div>
    </div>
  );
};
