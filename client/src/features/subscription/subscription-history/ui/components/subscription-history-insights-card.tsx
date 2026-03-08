import { FC } from "react";
import * as m from "@/i18n/messages";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components";
import { cn } from "@/shared/lib/classes-utils";
import { Clock3, LineChart, Sparkles } from "lucide-react";
import {
  HistoryInsights,
  isPriceChangeEvent,
} from "../../model/history-insights";
import { getSubscriptionHistoryActionLabel } from "../lib/subscription-history-actions";
import {
  areBudgetImpactsEqual,
  formatHistoryImpactLabel,
  formatHistoryImpactTone,
} from "../lib/subscription-history-impact";
import {
  formatAmount,
  formatHistoryDateLabel,
  formatHistoryRelativeTime,
} from "../lib/subscription-history-formatters";
import { SubscriptionHistoryInsightStat } from "./subscription-history-insight-stat";
import { type Locale } from "date-fns";

type SubscriptionHistoryInsightsCardProps = {
  insights: HistoryInsights;
  locale: Locale;
  onOpenTimeline: () => void;
};

export const SubscriptionHistoryInsightsCard: FC<
  SubscriptionHistoryInsightsCardProps
> = ({ insights, locale, onOpenTimeline }) => {
  const latestEvent = insights.events[0]?.record;
  const hasEnoughHistoryForComparisons = insights.totalEvents >= 1;
  const hasAnyPriceChanges = insights.events.some(isPriceChangeEvent);
  const latestIsPriceChange = insights.events[0]
    ? isPriceChangeEvent(insights.events[0])
    : false;

  const currentSpendValue = insights.currentRecurring
    ? formatAmount(
        insights.currentRecurring.monthly,
        insights.currentRecurring.currency,
      )
    : m.subscription_history_metric_unavailable();

  const currentSpendCaption = insights.currentRecurring
    ? `${formatAmount(insights.currentRecurring.yearly, insights.currentRecurring.currency)}${m.common_perYear()}`
    : undefined;

  const netChangeValue =
    hasEnoughHistoryForComparisons && hasAnyPriceChanges
      ? formatHistoryImpactLabel(insights.netImpact, locale)
      : m.subscription_history_metric_unavailable();
  const latestImpactValue =
    hasEnoughHistoryForComparisons && latestIsPriceChange
      ? formatHistoryImpactLabel(insights.latestImpact, locale)
      : m.subscription_history_metric_unavailable();

  const netChangeCaption = !hasEnoughHistoryForComparisons
    ? m.subscription_history_metric_needsMoreHistory()
    : !hasAnyPriceChanges
      ? m.subscription_history_metric_priceOnly()
      : m.subscription_history_metric_netChange_caption();

  const latestImpactCaption = !hasEnoughHistoryForComparisons
    ? m.subscription_history_metric_needsMoreHistory()
    : !latestIsPriceChange
      ? m.subscription_history_metric_lastNotPrice()
      : m.subscription_history_metric_latestImpact_caption();

  const shouldHideNetChangeCard =
    hasAnyPriceChanges &&
    latestIsPriceChange &&
    areBudgetImpactsEqual(insights.netImpact, insights.latestImpact) &&
    netChangeValue === latestImpactValue &&
    (insights.totalEvents === 1 || netChangeCaption === latestImpactCaption);

  const strongestImpactSummary = insights.strongestImpact
    ? m.subscription_history_insights_strongestImpact({
        action: getSubscriptionHistoryActionLabel(
          insights.strongestImpact.record.action,
        ),
        impact: formatHistoryImpactLabel(
          insights.strongestImpact.impact,
          locale,
        ),
      })
    : m.subscription_history_metric_unavailable();

  return (
    <Card className="overflow-hidden border-slate-200/70 py-0 dark:border-slate-700/70">
      <CardHeader className="relative overflow-hidden border-b px-4 pt-3 pb-3 md:px-6 md:pt-5 md:pb-4">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-sky-500/12 via-indigo-500/6 to-white/30 dark:from-sky-500/18 dark:via-indigo-500/10 dark:to-transparent" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <LineChart className="text-primary h-4 w-4 md:h-5 md:w-5" />
              {m.subscription_history_insights_title()}
            </CardTitle>
            <CardDescription className="max-w-130 text-xs md:text-sm">
              {m.subscription_history_insights_description()}
            </CardDescription>
          </div>

          <Button
            size="xs"
            className="h-8 gap-1.5 self-start px-2.5 text-xs shadow-sm md:h-9 md:gap-2 md:px-3 md:text-sm"
            onClick={onOpenTimeline}
          >
            {m.subscription_history_openTimeline()}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5 px-4 pt-3 pb-3 md:space-y-3.5 md:px-6 md:pt-4 md:pb-5">
        <div
          className={cn(
            "grid grid-cols-2 gap-2.5 md:gap-3",
            shouldHideNetChangeCard ? "md:grid-cols-2" : "md:grid-cols-3",
          )}
        >
          <SubscriptionHistoryInsightStat
            label={m.subscription_history_metric_currentSpend()}
            value={currentSpendValue}
            caption={currentSpendCaption}
          />
          {!shouldHideNetChangeCard && (
            <SubscriptionHistoryInsightStat
              label={m.subscription_history_metric_netChange()}
              value={netChangeValue}
              caption={netChangeCaption}
              toneClassName={
                hasEnoughHistoryForComparisons && hasAnyPriceChanges
                  ? formatHistoryImpactTone(insights.netImpact)
                  : undefined
              }
            />
          )}
          <SubscriptionHistoryInsightStat
            className={
              shouldHideNetChangeCard ? undefined : "col-span-2 md:col-span-1"
            }
            label={m.subscription_history_metric_latestImpact()}
            value={latestImpactValue}
            caption={latestImpactCaption}
            toneClassName={
              hasEnoughHistoryForComparisons && latestIsPriceChange
                ? formatHistoryImpactTone(insights.latestImpact)
                : undefined
            }
          />
        </div>

        <div className="border-primary/25 bg-primary/5 rounded-xl border p-2 md:p-3">
          <p className="text-foreground line-clamp-2 text-[11px] font-medium md:line-clamp-none md:text-xs">
            {strongestImpactSummary}
          </p>
        </div>

        <div className="flex flex-col items-start justify-between gap-1.5 md:flex-row md:items-center md:gap-2">
          <Badge
            variant="outline"
            className="h-6 gap-1 rounded-full px-2.5 text-[11px] md:text-xs"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            {m.subscription_history_totalEvents({
              count: insights.totalEvents,
            })}
          </Badge>

          {latestEvent && (
            <p className="text-muted-foreground text-[11px] md:text-xs">
              {m.subscription_history_insights_lastChange({
                date:
                  formatHistoryDateLabel(latestEvent.createdAt, locale) ??
                  m.subscription_history_unknownDate(),
                relative: formatHistoryRelativeTime(
                  latestEvent.createdAt,
                  locale,
                ),
              })}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const SubscriptionHistoryInsightsEmptyState: FC = () => (
  <Card className="overflow-hidden py-0">
    <CardHeader className="border-b pt-4 pb-4 md:pt-5">
      <CardTitle>{m.subscription_history_insights_title()}</CardTitle>
      <CardDescription>
        {m.subscription_history_insights_description()}
      </CardDescription>
    </CardHeader>
    <CardContent className="px-4 pt-3 pb-4 md:px-6 md:pt-4 md:pb-5">
      <div className="bg-muted/20 flex items-start gap-3 rounded-xl border border-dashed px-3 py-3">
        <Clock3 className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-1">
          <p className="text-foreground text-sm font-medium">
            {m.subscription_history_empty()}
          </p>
          <p className="text-muted-foreground text-xs">
            {m.subscription_history_empty_compact_hint()}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);
