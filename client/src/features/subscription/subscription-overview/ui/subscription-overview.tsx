import { FC, useMemo } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import NiceModal from "@ebay/nice-modal-react";
import { ChevronLeft } from "lucide-react";

import { DateTimezoneUtils } from "shared";
import { subscriptionQuery } from "@/entities/subscription";
import { Button } from "@/shared/components";
import { SubscriptionBillingUtils } from "../../billing/lib/subscription-billing-utils";
import { buildSubscriptionOverviewViewModel } from "../model/subscription-overview-view-model";
import { SubscriptionOverviewSummaryCard } from "./subscription-overview-summary-card";
import { SubscriptionOverviewMetaList } from "./subscription-overview-meta-list";
import { SubscriptionOverviewActionsDropdown } from "./subscription-overview-actions-dropdown";
import { SubscriptionOverviewStatusSelector } from "./subscription-overview-status-selector";
import {
  subscriptionOverviewFloatingCardClassName,
  subscriptionOverviewTopSectionClassName,
} from "./subscription-overview-layout-classnames";
import * as m from "@/i18n/messages";

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

  const handleMarkAsCanceled = () => {
    void handleOpenCancelDialog();
  };

  const handleRenew = () => {
    void handleOpenRenewDialog();
  };

  const handleBack = async () => {
    if (window.history.length > 1) {
      router.history.back();
      return;
    }

    await navigate({ to: "/subscriptions" });
  };

  return (
    <div className="flex flex-1 flex-col">
      <section className={subscriptionOverviewTopSectionClassName}>
        <Button
          variant="outline"
          size="icon"
          className="size-11 rounded-full shadow-sm"
          onClick={handleBack}
          aria-label={m.subscription_overview_back()}
        >
          <ChevronLeft className="size-4" aria-hidden />
          <span className="sr-only">{m.subscription_overview_back()}</span>
        </Button>
      </section>

      <section className={subscriptionOverviewFloatingCardClassName}>
        <div className="flex items-center justify-between gap-3">
          <SubscriptionOverviewStatusSelector
            status={subscription.status}
            onMarkAsCanceled={handleMarkAsCanceled}
            onRenew={handleRenew}
          />

          <SubscriptionOverviewActionsDropdown
            subscriptionId={subscription.id}
            subscriptionName={subscription.name}
            onDeleteSuccess={handleDeleteSuccess}
          />
        </div>

        <SubscriptionOverviewSummaryCard subscription={subscription} />

        <SubscriptionOverviewMetaList rows={viewModel.metaRows} />
      </section>
    </div>
  );
};
