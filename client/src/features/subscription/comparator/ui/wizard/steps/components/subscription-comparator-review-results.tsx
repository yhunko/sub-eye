import type { FC } from "react";
import {
  CurrencyUtils,
  type ComparatorDeltaDto,
  type ComparatorResultDto,
} from "shared";
import { CalendarClock, Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components";
import { cn } from "@/shared/lib/classes-utils";
import * as m from "@/i18n/messages";

type SubscriptionComparatorReviewResultsProps = {
  result: ComparatorResultDto;
  delta: ComparatorDeltaDto;
  monthlyImpactSummary: string;
  yearlyImpactSummary: string;
  isSavings: boolean;
  isIncrease: boolean;
};

export const SubscriptionComparatorReviewResults: FC<
  SubscriptionComparatorReviewResultsProps
> = ({
  result,
  delta,
  monthlyImpactSummary,
  yearlyImpactSummary,
  isSavings,
  isIncrease,
}) => (
  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
    <Card className="rounded-2xl xl:col-span-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {m.comparator_result_monthly_delta()}
        </CardTitle>
        <CardDescription>
          {m.comparator_result_monthly_delta_description()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "text-2xl font-semibold",
            isSavings
              ? "text-emerald-600"
              : isIncrease
                ? "text-rose-600"
                : "text-foreground",
          )}
        >
          {CurrencyUtils.formatSignedAmount(
            delta.monthlyDelta,
            result.preferredCurrencyCode,
          )}
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          {monthlyImpactSummary}
        </p>
      </CardContent>
    </Card>

    <Card className="rounded-2xl xl:col-span-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {m.comparator_result_yearly_delta()}
        </CardTitle>
        <CardDescription>
          {m.comparator_result_yearly_delta_description()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "text-2xl font-semibold",
            delta.yearlyDelta < 0
              ? "text-emerald-600"
              : delta.yearlyDelta > 0
                ? "text-rose-600"
                : "text-foreground",
          )}
        >
          {CurrencyUtils.formatSignedAmount(
            delta.yearlyDelta,
            result.preferredCurrencyCode,
          )}
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          {yearlyImpactSummary}
        </p>
      </CardContent>
    </Card>

    <Card className="rounded-2xl md:col-span-2 xl:col-span-7">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet aria-hidden className="size-4" />
          {m.comparator_result_cashflow_title()}
        </CardTitle>
        <CardDescription>
          {m.comparator_result_cashflow_description()}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border p-3">
          <p className="text-muted-foreground text-xs uppercase">
            {m.comparator_review_current()}
          </p>
          <div className="mt-3 grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-xs uppercase">
                {m.comparator_result_metric_charge()}
              </p>
              <p className="text-sm font-semibold">
                {CurrencyUtils.formatAmount(
                  result.currentPlan.immediateCharge,
                  result.preferredCurrencyCode,
                )}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-xs uppercase">
                {m.comparator_result_metric_monthly()}
              </p>
              <p className="text-sm font-semibold">
                {CurrencyUtils.formatAmount(
                  result.currentPlan.monthlyAmount,
                  result.preferredCurrencyCode,
                )}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-xs uppercase">
                {m.comparator_result_metric_yearly()}
              </p>
              <p className="text-sm font-semibold">
                {CurrencyUtils.formatAmount(
                  result.currentPlan.yearlyAmount,
                  result.preferredCurrencyCode,
                )}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border p-3">
          <p className="text-muted-foreground text-xs uppercase">
            {m.comparator_review_candidate()}
          </p>
          <div className="mt-3 grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-xs uppercase">
                {m.comparator_result_metric_charge()}
              </p>
              <p className="text-sm font-semibold">
                {CurrencyUtils.formatAmount(
                  result.candidatePlan.immediateCharge,
                  result.preferredCurrencyCode,
                )}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-xs uppercase">
                {m.comparator_result_metric_monthly()}
              </p>
              <p className="text-sm font-semibold">
                {CurrencyUtils.formatAmount(
                  result.candidatePlan.monthlyAmount,
                  result.preferredCurrencyCode,
                )}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-xs uppercase">
                {m.comparator_result_metric_yearly()}
              </p>
              <p className="text-sm font-semibold">
                {CurrencyUtils.formatAmount(
                  result.candidatePlan.yearlyAmount,
                  result.preferredCurrencyCode,
                )}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card className="rounded-2xl md:col-span-2 xl:col-span-5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock aria-hidden className="size-4" />
          {m.comparator_result_portfolio_title()}
        </CardTitle>
        <CardDescription>
          {m.comparator_result_portfolio_description()}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border p-3">
          <p className="text-muted-foreground text-xs uppercase">
            {m.comparator_result_portfolio_current()}
          </p>
          <p className="mt-1 text-lg font-semibold">
            {CurrencyUtils.formatAmount(
              result.portfolioContext.currentMonthlyTotal,
              result.preferredCurrencyCode,
            )}
          </p>
        </div>
        <div className="rounded-xl border p-3">
          <p className="text-muted-foreground text-xs uppercase">
            {m.comparator_result_portfolio_projected()}
          </p>
          <p className="mt-1 text-lg font-semibold">
            {CurrencyUtils.formatAmount(
              result.portfolioContext.projectedMonthlyTotal,
              result.preferredCurrencyCode,
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
);
