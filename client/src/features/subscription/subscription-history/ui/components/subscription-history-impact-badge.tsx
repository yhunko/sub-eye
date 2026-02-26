import { FC } from "react";
import * as m from "@/i18n/messages";
import { Badge } from "@/shared/components";
import { cn } from "@/shared/lib/classes-utils";
import { type Locale } from "date-fns";
import { HistoryEventInsight } from "../../model/history-insights";
import {
  formatAmount,
  formatHistoryDateLabel,
} from "../lib/subscription-history-formatters";

type SubscriptionHistoryImpactBadgeProps = {
  event: HistoryEventInsight;
  locale: Locale;
};

export const SubscriptionHistoryImpactBadge: FC<
  SubscriptionHistoryImpactBadgeProps
> = ({ event, locale }) => {
  const { impact } = event;

  if (!impact.comparable) {
    let fallback = m.subscription_history_impact_missingData();

    if (impact.reason === "mixedCurrency") {
      fallback = m.subscription_history_impact_mixedCurrency();
    } else if (impact.reason === "missingPreviousState") {
      fallback = m.subscription_history_impact_noPreviousState();
    }

    return (
      <Badge variant="outline" className="h-6 text-[11px]">
        {fallback}
      </Badge>
    );
  }

  const delta = impact.monthlyDelta ?? 0;

  if (Math.abs(delta) < 0.0001) {
    return (
      <Badge variant="outline" className="h-6 text-[11px]">
        {m.subscription_history_impact_noChange()}
      </Badge>
    );
  }

  const tone =
    delta > 0
      ? "border-rose-300/70 bg-rose-500/10 text-rose-700 dark:border-rose-800/60 dark:text-rose-300"
      : "border-emerald-300/70 bg-emerald-500/10 text-emerald-700 dark:border-emerald-800/60 dark:text-emerald-300";

  const sign = delta > 0 ? "+" : "-";
  const monthlyLabel = `${sign}${formatAmount(Math.abs(delta), impact.currency ?? "usd")}${m.common_perMonth()}`;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant="outline" className={cn("h-6 text-[11px]", tone)}>
        {monthlyLabel}
      </Badge>
      {impact.deferredUntil && (
        <span className="text-muted-foreground text-[11px]">
          {m.subscription_history_impact_startsAfter({
            date:
              formatHistoryDateLabel(impact.deferredUntil, locale) ??
              m.subscription_history_unknownDate(),
          })}
        </span>
      )}
    </div>
  );
};
