import type { Locale } from "date-fns";
import { CalendarClock, Clock3, RefreshCw, Sparkles } from "lucide-react";
import { type FC, useState } from "react";
import { PlanFeatureLockCard } from "@/entities/billing";
import { useDeleteSubscriptionHistoryItem } from "@/entities/subscription";
import * as m from "@/i18n/messages";
import { Button, Skeleton } from "@/shared/components";
import { cn } from "@/shared/lib/classes-utils";
import {
  HISTORY_FREE_LIMIT,
  type HistoryInsights,
} from "../../model/history-insights";
import { SubscriptionHistoryTimelineEvent } from "./subscription-history-timeline-event";

type SubscriptionHistoryTimelineBodyProps = {
  subscriptionId: string;
  insights: HistoryInsights;
  hasMore: boolean;
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  onRetry: () => void;
  onUpgrade: () => Promise<void> | void;
  locale: Locale;
  compact?: boolean;
};

export const SubscriptionHistoryTimelineBody: FC<
  SubscriptionHistoryTimelineBodyProps
> = ({
  subscriptionId,
  insights,
  hasMore,
  isPending,
  isError,
  isFetching,
  onRetry,
  onUpgrade,
  locale,
  compact = false,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteHistoryItem = useDeleteSubscriptionHistoryItem();

  const handleDelete = (historyId: string) => {
    setDeletingId(historyId);
    deleteHistoryItem.mutate(
      {
        subscriptionId,
        historyId,
      },
      {
        onSettled: () => {
          setDeletingId((current) => (current === historyId ? null : current));
        },
      },
    );
  };

  if (isPending) {
    return (
      <div className={cn("space-y-2.5 p-3", !compact && "md:space-y-3 md:p-6")}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "space-y-2 rounded-xl border p-3",
              !compact && "md:space-y-3 md:p-4",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className={cn("p-3", !compact && "md:p-6")}>
        <div className="bg-muted/30 rounded-xl border border-dashed p-4">
          <p className="text-muted-foreground text-sm">
            {m.subscription_history_error()}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 gap-2"
            onClick={onRetry}
            disabled={isFetching}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isFetching && "animate-spin")}
            />
            {m.subscription_history_retry()}
          </Button>
        </div>
      </div>
    );
  }

  if (insights.events.length === 0) {
    return (
      <div className={cn("p-3", !compact && "md:p-6")}>
        <div
          className={cn(
            "bg-muted/20 flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-4 text-center",
            !compact && "md:min-h-40 md:py-6",
          )}
        >
          <Clock3 className="text-muted-foreground h-4 w-4 md:h-5 md:w-5" />
          <p className="text-muted-foreground text-xs md:text-sm">
            {m.subscription_history_empty()}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto px-3 py-3",
          !compact && "md:px-6 md:py-6",
        )}
      >
        <div className={cn("space-y-2.5", !compact && "md:space-y-3")}>
          {insights.hasMixedCurrencies && (
            <div className="rounded-xl border border-amber-300/50 bg-amber-500/10 p-3">
              <p className="text-[11px] font-medium text-amber-700 md:text-xs dark:text-amber-300">
                {m.subscription_history_mixedCurrency_hint()}
              </p>
            </div>
          )}

          {insights.events.map((event, index) => (
            <SubscriptionHistoryTimelineEvent
              key={event.record.id}
              event={event}
              locale={locale}
              compact={compact}
              isLatestRecord={index === 0}
              isDeleting={deletingId === event.record.id}
              isDeletePending={deleteHistoryItem.isPending}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>

      {hasMore && (
        <div
          className={cn(
            "space-y-3 border-t px-3 py-3",
            !compact && "md:px-6 md:py-4",
          )}
        >
          <div className="bg-muted/30 rounded-lg border p-3">
            <div className="text-foreground flex items-center gap-2 text-[11px] font-medium md:text-xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              {m.subscription_history_showingRecent({
                limit: HISTORY_FREE_LIMIT,
              })}
            </div>
            <p className="text-muted-foreground mt-1 text-[11px] md:text-xs">
              {m.subscription_history_hiddenEvents()}
            </p>
          </div>
          <PlanFeatureLockCard
            icon={<CalendarClock className="h-4 w-4 text-amber-600" />}
            title={m.subscription_history_premium_title()}
            description={m.subscription_history_premium_description()}
            ctaLabel={m.subscription_history_premium_action()}
            className="p-4"
            onCtaClick={onUpgrade}
          />
        </div>
      )}
    </div>
  );
};
