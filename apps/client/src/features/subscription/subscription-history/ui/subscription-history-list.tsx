import { type FC, useMemo } from "react";
import { useSubscriptionHistory } from "@/entities/subscription/api/use-subscription-history";
import { useDateFnsLocale } from "@/shared/lib/date-fns-context";
import { buildHistoryInsights } from "../model/history-insights";
import { openSubscriptionHistoryPanel } from "../model/open-subscription-history-panel";
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

export const SubscriptionHistoryList: FC<SubscriptionHistoryListProps> = ({
  subscriptionId,
}) => {
  const { locale } = useDateFnsLocale();

  const { data, isPending, isError, isFetching, refetch } =
    useSubscriptionHistory({
      params: { id: subscriptionId },
    });

  const history = data?.history;
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
    <SubscriptionHistoryInsightsCard
      insights={insights}
      locale={locale}
      onOpenTimeline={() => {
        void openSubscriptionHistoryPanel({ subscriptionId });
      }}
    />
  );
};
