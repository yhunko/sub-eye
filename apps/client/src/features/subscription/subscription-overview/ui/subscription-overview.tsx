import { useAuth, useUser } from "@clerk/clerk-react";
import NiceModal from "@ebay/nice-modal-react";
import { DateTimezoneUtils } from "@subeye/shared";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { type FC, useMemo } from "react";
import { categoriesQuery } from "@/entities/category";
import {
  SubscriptionBillingUtils,
  subscriptionQuery,
} from "@/entities/subscription";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import type { SubscriptionOverviewSearch } from "@/shared/lib/router/subscription-overview-search";
import { useScheduledPriceChangeActions } from "../../schedule-price-change";
import { buildSubscriptionOverviewViewModel } from "../model/subscription-overview-view-model";
import { SubscriptionOverviewHeaderActions } from "./subscription-overview-header-actions";
import { subscriptionOverviewFloatingCardClassName } from "./subscription-overview-layout-classnames";
import { SubscriptionOverviewMetaList } from "./subscription-overview-meta-list";
import { SubscriptionOverviewSummaryCard } from "./subscription-overview-summary-card";

type SubscriptionOverviewProps = {
  subscriptionId: string;
  returnSearch?: SubscriptionOverviewSearch;
};

export const SubscriptionOverview: FC<SubscriptionOverviewProps> = ({
  subscriptionId,
  returnSearch,
}) => {
  const navigate = useNavigate();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { userId } = useAuth();
  const { dateFnsFormat } = useDateFormat();

  const { data: subscription } = useSuspenseQuery(
    subscriptionQuery({
      params: { id: subscriptionId, userId: userId ?? "" },
    }),
  );

  const { data: categories } = useSuspenseQuery(
    categoriesQuery({ params: { userId: userId ?? "" } }),
  );

  const { openScheduleDialog } = useScheduledPriceChangeActions({
    subscription,
  });

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

  const category = useMemo(
    () =>
      subscription.categoryId
        ? (categories?.find((c) => c.id === subscription.categoryId) ?? null)
        : null,
    [categories, subscription.categoryId],
  );

  const viewModel = useMemo(
    () =>
      buildSubscriptionOverviewViewModel(
        subscription,
        displayState,
        dateFnsFormat,
        category,
      ),
    [displayState, subscription, dateFnsFormat, category],
  );

  const handleDeleteSuccess = async () => {
    await navigate({ to: "/subscriptions" });
  };

  const handleOpenCancelDialog = async () => {
    const { SubscriptionCancelDialog } = await import(
      "../../subscription-cancel-dialog"
    );

    await NiceModal.show(SubscriptionCancelDialog, {
      subscriptionId,
      subscriptionName: subscription.name,
      defaultCancelledAt: subscription.nextPaymentDate,
    });
  };

  const handleOpenRenewDialog = async () => {
    const { SubscriptionRenewDialog } = await import(
      "../../subscription-renew-dialog"
    );

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
    if (returnSearch?.from === "/") {
      await navigate({
        to: "/",
        search: (previousSearch) => ({
          ...previousSearch,
          monthlyTrendOpen: returnSearch.monthlyTrendOpen ? true : undefined,
          monthlyTrendMonth: returnSearch.monthlyTrendMonth,
        }),
        replace: true,
      });
      return;
    }

    if (window.history.length > 1) {
      router.history.back();
      return;
    }

    await navigate({ to: "/subscriptions" });
  };

  return (
    <div className="flex flex-1 flex-col">
      <section className={subscriptionOverviewFloatingCardClassName}>
        <SubscriptionOverviewHeaderActions
          subscriptionId={subscription.id}
          subscriptionName={subscription.name}
          hasScheduledPriceChange={Boolean(subscription.scheduledPriceChange)}
          onSchedulePriceChange={openScheduleDialog}
          onDeleteSuccess={handleDeleteSuccess}
          status={subscription.status}
          onMarkAsCanceled={handleMarkAsCanceled}
          onRenew={handleRenew}
          onBack={handleBack}
        />

        <SubscriptionOverviewSummaryCard subscription={subscription} />

        <SubscriptionOverviewMetaList rows={viewModel.metaRows} />
      </section>
    </div>
  );
};
