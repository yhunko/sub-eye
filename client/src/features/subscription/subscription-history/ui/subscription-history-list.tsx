import { FC, lazy, Suspense, useMemo, useState } from "react";
import { useSubscriptionHistory } from "@/entities/subscription/api/use-subscription-history";
import { useDateFnsLocale } from "@/shared/lib/date-fns-context";
import { buildHistoryInsights } from "../model/history-insights";
import {
  SubscriptionHistoryInsightsCard,
  SubscriptionHistoryInsightsEmptyState,
} from "./components/subscription-history-insights-card";
import {
  SubscriptionHistoryInsightsErrorState,
  SubscriptionHistoryInsightsLoadingState,
} from "./components/subscription-history-overview-states";

type SubscriptionHistoryListProps = {
  subscriptionId: string;
};

const SubscriptionHistoryPanel = lazy(
  () => import("./subscription-history-panel"),
);

export const SubscriptionHistoryList: FC<SubscriptionHistoryListProps> = ({
  subscriptionId,
}) => {
  const { locale } = useDateFnsLocale();
  const [open, setOpen] = useState(false);
  const [isPanelLoaded, setIsPanelLoaded] = useState(false);

  const { data, isPending, isError, isFetching, refetch } =
    useSubscriptionHistory({
      params: { id: subscriptionId },
    });

  const history = data?.history;
  const hasMore = data?.hasMore ?? false;
  const insights = useMemo(
    () => buildHistoryInsights(history ?? []),
    [history],
  );

  if (isPending) {
    return <SubscriptionHistoryInsightsLoadingState />;
  }

  if (isError) {
    return (
      <SubscriptionHistoryInsightsErrorState
        isFetching={isFetching}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  if (!history || history.length === 0) {
    return <SubscriptionHistoryInsightsEmptyState />;
  }

  return (
    <>
      <SubscriptionHistoryInsightsCard
        insights={insights}
        locale={locale}
        onOpenTimeline={() => {
          setIsPanelLoaded(true);
          setOpen(true);
        }}
      />

      {isPanelLoaded && (
        <Suspense fallback={null}>
          <SubscriptionHistoryPanel
            subscriptionId={subscriptionId}
            open={open}
            onOpenChange={setOpen}
            insights={insights}
            hasMore={hasMore}
            isPending={isPending}
            isError={isError}
            isFetching={isFetching}
            onRetry={() => {
              void refetch();
            }}
            locale={locale}
          />
        </Suspense>
      )}
    </>
  );
};
