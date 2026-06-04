import type {
  AnalyzeComparatorResponseDto,
  ComparatorDeltaDto,
  ComparatorResultDto,
  MonthlyUsage,
} from "@subeye/shared";
import { Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import type { FC } from "react";
import * as m from "@/i18n/messages";
import {
  Alert,
  AlertDescription,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components";
import type { PlanPreview } from "../subscription-comparator-wizard.types";
import { SubscriptionComparatorAiInsightsCard } from "./components/subscription-comparator-ai-insights-card";
import {
  type ComparatorInsightTag,
  SubscriptionComparatorInsightTag,
} from "./components/subscription-comparator-insight-tag";
import { SubscriptionComparatorReviewPreview } from "./components/subscription-comparator-review-preview";
import { SubscriptionComparatorReviewResults } from "./components/subscription-comparator-review-results";

type SubscriptionComparatorStepReviewProps = {
  currentPreview: PlanPreview;
  candidatePreview: PlanPreview;
  isPending: boolean;
  result: ComparatorResultDto | undefined;
  delta: ComparatorDeltaDto | undefined;
  monthlyImpactSummary: string;
  yearlyImpactSummary: string;
  isSavings: boolean;
  isIncrease: boolean;
  canAnalyze: boolean;
  canRegenerate: boolean;
  isAnalyzePending: boolean;
  aiResult: AnalyzeComparatorResponseDto | undefined;
  aiQuota: MonthlyUsage | undefined;
  isAiQuotaReached: boolean;
  userIntentNote: string;
  onUserIntentNoteChange: (note: string) => void;
  onAnalyze: () => void;
};

const SubscriptionComparatorStepReview: FC<
  SubscriptionComparatorStepReviewProps
> = ({
  currentPreview,
  candidatePreview,
  isPending,
  result,
  delta,
  monthlyImpactSummary,
  yearlyImpactSummary,
  isSavings,
  isIncrease,
  canAnalyze,
  canRegenerate,
  isAnalyzePending,
  aiResult,
  aiQuota,
  isAiQuotaReached,
  userIntentNote,
  onUserIntentNoteChange,
  onAnalyze,
}) => {
  const reviewTags: ComparatorInsightTag[] = [];

  if (delta) {
    reviewTags.push(
      isSavings
        ? {
            id: "summary-save",
            label: m.comparator_result_tag_save(),
            icon: TrendingDown,
            tone: "positive",
          }
        : isIncrease
          ? {
              id: "summary-increase",
              label: m.comparator_result_tag_increase(),
              icon: TrendingUp,
              tone: "negative",
            }
          : {
              id: "summary-neutral",
              label: m.comparator_result_tag_neutral(),
              icon: Sparkles,
              tone: "neutral",
            },
    );

    if (delta.monthlyPercent !== null) {
      const sign =
        delta.monthlyPercent > 0 ? "+" : delta.monthlyPercent < 0 ? "-" : "";
      const monthlyLabel = `${m.comparator_result_metric_monthly()} ${sign}${m.comparator_result_percent(
        {
          value: String(Math.abs(delta.monthlyPercent)),
        },
      )}`;

      reviewTags.push({
        id: "summary-monthly",
        label: monthlyLabel,
        icon:
          delta.monthlyPercent < 0
            ? TrendingDown
            : delta.monthlyPercent > 0
              ? TrendingUp
              : Sparkles,
        tone:
          delta.monthlyPercent < 0
            ? "positive"
            : delta.monthlyPercent > 0
              ? "negative"
              : "neutral",
        title: monthlyImpactSummary,
      });
    }
  }

  return (
    <div className="space-y-3">
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-base">
                {m.comparator_review_title()}
              </CardTitle>
              <CardDescription>
                {m.comparator_review_description()}
              </CardDescription>
            </div>

            {reviewTags.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 md:max-w-[55%] md:justify-end">
                {reviewTags.slice(0, 2).map((tag) => (
                  <SubscriptionComparatorInsightTag key={tag.id} tag={tag} />
                ))}
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <SubscriptionComparatorReviewPreview
            currentPreview={currentPreview}
            candidatePreview={candidatePreview}
            deltaMonthlyYearly={delta}
          />
        </CardContent>
      </Card>

      {isPending && (
        <Alert>
          <AlertDescription>{m.comparator_computing()}</AlertDescription>
        </Alert>
      )}

      {result && delta && (
        <>
          <SubscriptionComparatorReviewResults
            result={result}
            delta={delta}
            monthlyImpactSummary={monthlyImpactSummary}
            yearlyImpactSummary={yearlyImpactSummary}
            isSavings={isSavings}
            isIncrease={isIncrease}
          />

          <SubscriptionComparatorAiInsightsCard
            aiResult={aiResult}
            aiQuota={aiQuota}
            canAnalyze={canAnalyze}
            canRegenerate={canRegenerate}
            isAnalyzePending={isAnalyzePending}
            isAiQuotaReached={isAiQuotaReached}
            userIntentNote={userIntentNote}
            onUserIntentNoteChange={onUserIntentNoteChange}
            onAnalyze={onAnalyze}
          />
        </>
      )}
    </div>
  );
};

export default SubscriptionComparatorStepReview;
