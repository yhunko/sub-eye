import { FC, lazy, Suspense, useMemo, useState } from "react";
import { HistoryIcon, LoaderCircle } from "lucide-react";
import { Button } from "@/shared/components";
import { useDateFnsLocale } from "@/shared/lib/date-fns-context";
import { cn } from "@/shared/lib/classes-utils";
import { buildHistoryInsights } from "../model/history-insights";
import { useSubscriptionHistory } from "@/entities/subscription/api/use-subscription-history";
import * as m from "@/i18n/messages";

const SubscriptionHistoryPanel = lazy(
  () => import("./subscription-history-panel"),
);

type SubscriptionHistoryTimelineTriggerProps = {
  subscriptionId: string;
  className?: string;
};

export const SubscriptionHistoryTimelineTrigger: FC<
  SubscriptionHistoryTimelineTriggerProps
> = ({ subscriptionId, className }) => {
  const { locale } = useDateFnsLocale();
  const [open, setOpen] = useState(false);
  const [isPanelLoaded, setIsPanelLoaded] = useState(false);

  const { data, isPending, isError, isFetching, refetch } =
    useSubscriptionHistory({
      params: { id: subscriptionId },
      options: {
        enabled: isPanelLoaded || open,
      },
    });

  const history = data?.history;
  const hasMore = data?.hasMore ?? false;
  const insights = useMemo(
    () => buildHistoryInsights(history ?? []),
    [history],
  );

  return (
    <>
      <Button
        size="lg"
        variant="outline"
        className={cn("h-11 w-full justify-start rounded-xl", className)}
        onClick={() => {
          setIsPanelLoaded(true);
          setOpen(true);
        }}
      >
        {isPending || isFetching ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        ) : (
          <HistoryIcon className="size-4" aria-hidden />
        )}
        {m.subscription_history_openTimeline()}
      </Button>

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
