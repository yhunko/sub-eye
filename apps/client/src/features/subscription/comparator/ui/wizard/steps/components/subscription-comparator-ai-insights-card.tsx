import type {
  AnalyzeComparatorResponseDto,
  MonthlyUsage,
} from "@subeye/shared";
import type { FC } from "react";
import { PlanFeatureLockCard } from "@/entities/billing";
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
import { AiQuotaBadge } from "@/shared/ui";
import { resolveFallbackMessage } from "./ai-insights-labels";
import {
  AnalyzeButton,
  AnalyzingProgress,
  InsightsContent,
  RegenerateButton,
  UserIntentNoteInput,
} from "./ai-insights-sub-components";

type SubscriptionComparatorAiInsightsCardProps = {
  aiResult: AnalyzeComparatorResponseDto | undefined;
  aiQuota: MonthlyUsage | undefined;
  canAnalyze: boolean;
  canRegenerate: boolean;
  isAnalyzePending: boolean;
  isAiQuotaReached: boolean;
  userIntentNote: string;
  onUserIntentNoteChange: (note: string) => void;
  onAnalyze: () => void;
};

export const SubscriptionComparatorAiInsightsCard: FC<
  SubscriptionComparatorAiInsightsCardProps
> = ({
  aiResult,
  aiQuota,
  canAnalyze,
  canRegenerate,
  isAnalyzePending,
  isAiQuotaReached,
  userIntentNote,
  onUserIntentNoteChange,
  onAnalyze,
}) => {
  const isAiAlreadyGenerated = Boolean(
    aiResult?.mode === "ai" && aiResult.aiInsights,
  );

  return (
    <Card className="rounded-2xl border-dashed">
      <CardHeader className="px-3 pb-2 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              {m.comparator_ai_title()}
            </CardTitle>
            <CardDescription>{m.comparator_ai_description()}</CardDescription>
          </div>
          {aiQuota && (
            <AiQuotaBadge
              usage={aiQuota}
              analyticsSource="comparator_ai_card"
            />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 px-3 md:px-6">
        {isAiQuotaReached && !aiResult?.aiInsights ? (
          <PlanFeatureLockCard
            title={m.comparator_ai_upgrade_title()}
            description={m.comparator_ai_upgrade_description()}
            analyticsSource="comparator_ai"
            analyticsFeature="ai_quota"
          />
        ) : (
          <>
            <UserIntentNoteInput
              value={userIntentNote}
              onChange={onUserIntentNoteChange}
              disabled={isAnalyzePending}
            />

            {isAiAlreadyGenerated ? (
              <RegenerateButton
                isAnalyzePending={isAnalyzePending}
                isAnalyzeDisabled={!canRegenerate || isAnalyzePending}
                onAnalyze={onAnalyze}
              />
            ) : (
              <AnalyzeButton
                disabledReason={
                  isAiQuotaReached
                    ? m.comparator_ai_quota_reached()
                    : !canAnalyze
                      ? m.comparator_ai_requires_compare()
                      : null
                }
                isAnalyzePending={isAnalyzePending}
                isAnalyzeDisabled={
                  isAiQuotaReached || !canAnalyze || isAnalyzePending
                }
                onAnalyze={onAnalyze}
              />
            )}

            {isAnalyzePending && <AnalyzingProgress />}
          </>
        )}

        {aiResult?.mode === "fallback" && (
          <Alert>
            <AlertDescription>
              {resolveFallbackMessage(aiResult.fallbackReason)}{" "}
              {m.comparator_ai_core_fallback_reason({
                reason: aiResult.coreInsights.reason,
              })}
            </AlertDescription>
          </Alert>
        )}

        {aiResult?.aiInsights && <InsightsContent aiResult={aiResult} />}
      </CardContent>
    </Card>
  );
};
