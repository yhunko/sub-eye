import { useAuth, useUser } from "@clerk/clerk-react";
import { DateTimezoneUtils } from "@subeye/shared";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { format } from "date-fns";
import { type FC, useCallback, useMemo } from "react";
import { categoriesQuery } from "@/entities/category";
import {
  SubscriptionBillingUtils,
  subscriptionQuery,
} from "@/entities/subscription";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { useDateFnsLocale } from "@/shared/lib/date-fns-context";
import type { SubscriptionOverviewSearch } from "@/shared/lib/router/subscription-overview-search";
import { buildSubscriptionOverviewViewModel } from "../model/subscription-overview-view-model";
import { SubscriptionOverviewHeaderActions } from "./subscription-overview-header-actions";
import { subscriptionOverviewFloatingCardClassName } from "./subscription-overview-layout-classnames";
import { SubscriptionOverviewManageActions } from "./subscription-overview-manage-actions";
import { SubscriptionOverviewMetaList } from "./subscription-overview-meta-list";
import { SubscriptionOverviewSummaryCard } from "./subscription-overview-summary-card";
import { SubscriptionPricingTimeline } from "./subscription-pricing-timeline";

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
  const { locale } = useDateFnsLocale();

  const { data: subscription } = useSuspenseQuery(
    subscriptionQuery({
      params: { id: subscriptionId, userId: userId ?? "" },
    }),
  );

  const { data: categories } = useSuspenseQuery(
    categoriesQuery({ params: { userId: userId ?? "" } }),
  );

  const formatDate = useCallback(
    (iso: string) => {
      const parsed = new Date(iso);
      return Number.isNaN(parsed.getTime())
        ? iso
        : format(parsed, dateFnsFormat, { locale });
    },
    [dateFnsFormat, locale],
  );

  const displayState = useMemo(() => {
    if (!subscription || !isLoaded) return null;

    const timezone = user?.publicMetadata?.preferredTimezone as
      | string
      | undefined;

    const targetDate =
      subscription.status !== "active" && subscription.willBeCancelledAt
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
          onDeleteSuccess={handleDeleteSuccess}
          onBack={handleBack}
        />

        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start lg:gap-8">
          <div className="lg:sticky lg:top-20">
            <SubscriptionOverviewSummaryCard
              subscription={subscription}
              formatDate={formatDate}
            />
          </div>

          <div className="flex flex-col gap-6">
            <SubscriptionPricingTimeline
              subscription={subscription}
              formatDate={formatDate}
            />

            <SubscriptionOverviewMetaList rows={viewModel.metaRows} />

            <SubscriptionOverviewManageActions subscription={subscription} />
          </div>
        </div>
      </section>
    </div>
  );
};
