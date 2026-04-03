import type { Locale } from "date-fns";
import { Trash2 } from "lucide-react";
import { type FC, useMemo } from "react";
import * as m from "@/i18n/messages";
import { Badge, Button } from "@/shared/components";
import { cn } from "@/shared/lib/classes-utils";
import type { HistoryEventInsight } from "../../model/history-insights";
import {
  getSubscriptionHistoryActionLabel,
  getSubscriptionHistoryActionVisual,
} from "../lib/subscription-history-actions";
import { getHistoryChangeDetails } from "../lib/subscription-history-change-details";
import { formatHistoryRelativeTime } from "../lib/subscription-history-formatters";
import { SubscriptionHistoryImpactBadge } from "./subscription-history-impact-badge";

type SubscriptionHistoryTimelineEventProps = {
  event: HistoryEventInsight;
  locale: Locale;
  compact: boolean;
  isLatestRecord: boolean;
  isDeleting: boolean;
  isDeletePending: boolean;
  onDelete: (historyId: string) => void;
};

export const SubscriptionHistoryTimelineEvent: FC<
  SubscriptionHistoryTimelineEventProps
> = ({
  event,
  locale,
  compact,
  isLatestRecord,
  isDeleting,
  isDeletePending,
  onDelete,
}) => {
  const details = useMemo(
    () => getHistoryChangeDetails(event, locale),
    [event, locale],
  );
  const visibleDetails =
    details.length > 0 ? details : [m.subscription_history_updatedGeneral()];
  const actionVisual = getSubscriptionHistoryActionVisual(event.record.action);
  const ActionIcon = actionVisual.icon;
  const relativeTime = useMemo(
    () => formatHistoryRelativeTime(event.record.createdAt, locale),
    [event.record.createdAt, locale],
  );

  return (
    <article
      className={cn(
        "rounded-xl border p-3 transition-colors",
        !compact && "md:p-4",
        isLatestRecord &&
          "border-primary/40 from-primary/10 via-primary/5 bg-linear-to-r to-transparent",
      )}
    >
      <div className="flex items-start gap-2.5 md:gap-3">
        <div
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full md:h-8 md:w-8",
            actionVisual.iconTone,
          )}
        >
          <ActionIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-2.5 md:space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn("h-6 text-[11px]", actionVisual.badgeTone)}
                >
                  {getSubscriptionHistoryActionLabel(event.record.action)}
                </Badge>
                <SubscriptionHistoryImpactBadge event={event} locale={locale} />
              </div>
            </div>
            <div className="flex items-start justify-end gap-1.5">
              <p className="text-muted-foreground/85 text-[11px] leading-5 md:text-xs">
                {relativeTime}
              </p>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-destructive h-5 w-5 rounded-md"
                aria-label={m.subscription_history_delete_action_aria()}
                disabled={isDeletePending || isDeleting}
                onClick={() => {
                  if (
                    !window.confirm(m.subscription_history_delete_confirm())
                  ) {
                    return;
                  }

                  onDelete(event.record.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            {!compact && (
              <p className="text-muted-foreground text-[11px] font-medium tracking-[0.08em] uppercase">
                {m.subscription_history_changesLabel()}
              </p>
            )}
            <div className="space-y-1">
              {visibleDetails.map((detail, detailIndex) => (
                <div
                  key={`${event.record.id}-${detailIndex}`}
                  className="flex items-start gap-2"
                >
                  <span className="bg-primary/70 mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
                  <p className="text-foreground/90 text-[13px] leading-5 md:text-sm">
                    {detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};
