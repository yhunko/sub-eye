import type { FC } from "react";
import { ExternalLink, Sparkles, Lock } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  GlowEffect,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components";
import { AiQuotaBadge } from "@/shared/ui";
import * as m from "@/i18n/messages";
import type { AnalyzeComparatorResponseDto, MonthlyUsage } from "shared";

type SubscriptionComparatorAiInsightsCardProps = {
  aiResult: AnalyzeComparatorResponseDto | undefined;
  aiQuota: MonthlyUsage | undefined;
  canAnalyze: boolean;
  isAnalyzePending: boolean;
  isAiQuotaReached: boolean;
  onAnalyze: () => void;
};

type RecommendationDecision = "switch" | "keep" | "trial_first" | "depends";
type RecommendationConfidence = "low" | "medium" | "high";
type MaturityLevel = "low" | "medium" | "high" | "unknown";
type PriceSignificanceLevel = "negligible" | "moderate" | "material";
type CommitmentTerm = "monthly" | "yearly" | "either";

const AI_INSIGHTS_GLOW_COLORS = ["#4285F4", "#9B72CB", "#D96570", "#F2A600"];

const resolveFallbackMessage = (reason: string | null): string => {
  if (reason === "quota_exceeded") {
    return m.comparator_ai_fallback_quota();
  }

  if (reason === "provider_unavailable") {
    return m.comparator_ai_fallback_provider();
  }

  return m.comparator_ai_fallback_generic();
};

const resolveRecommendationDecisionLabel = (
  decision: RecommendationDecision,
): string => {
  switch (decision) {
    case "switch":
      return m.comparator_ai_recommendation_decision_switch();
    case "keep":
      return m.comparator_ai_recommendation_decision_keep();
    case "trial_first":
      return m.comparator_ai_recommendation_decision_trial_first();
    case "depends":
      return m.comparator_ai_recommendation_decision_depends();
    default:
      return decision;
  }
};

const resolveRecommendationConfidenceLabel = (
  confidence: RecommendationConfidence,
): string => {
  switch (confidence) {
    case "low":
      return m.comparator_ai_recommendation_confidence_low();
    case "medium":
      return m.comparator_ai_recommendation_confidence_medium();
    case "high":
      return m.comparator_ai_recommendation_confidence_high();
    default:
      return confidence;
  }
};

const resolveMaturityLevelLabel = (level: MaturityLevel): string => {
  switch (level) {
    case "low":
      return m.comparator_ai_maturity_level_low();
    case "medium":
      return m.comparator_ai_maturity_level_medium();
    case "high":
      return m.comparator_ai_maturity_level_high();
    case "unknown":
      return m.comparator_ai_maturity_level_unknown();
    default:
      return level;
  }
};

const resolvePriceLevelLabel = (level: PriceSignificanceLevel): string => {
  switch (level) {
    case "negligible":
      return m.comparator_ai_price_level_negligible();
    case "moderate":
      return m.comparator_ai_price_level_moderate();
    case "material":
      return m.comparator_ai_price_level_material();
    default:
      return level;
  }
};

const resolveCommitmentTermLabel = (term: CommitmentTerm): string => {
  switch (term) {
    case "monthly":
      return m.comparator_ai_commitment_term_monthly();
    case "yearly":
      return m.comparator_ai_commitment_term_yearly();
    case "either":
      return m.comparator_ai_commitment_term_either();
    default:
      return term;
  }
};

const AnalyzeButton: FC<{
  disabledReason: string | null;
  isAnalyzePending: boolean;
  isAnalyzeDisabled: boolean;
  onAnalyze: () => void;
}> = ({ disabledReason, isAnalyzePending, isAnalyzeDisabled, onAnalyze }) => {
  if (disabledReason && !isAnalyzePending) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block">
              <Button
                type="button"
                variant="outline"
                onClick={onAnalyze}
                disabled={isAnalyzeDisabled}
              >
                <Lock />
                {m.comparator_ai_action_generate()}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">{disabledReason}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onAnalyze}
      disabled={isAnalyzeDisabled}
    >
      <Sparkles />
      {isAnalyzePending
        ? m.comparator_ai_action_loading()
        : m.comparator_ai_action_generate()}
    </Button>
  );
};

const InsightsContent: FC<{
  aiResult: AnalyzeComparatorResponseDto;
}> = ({ aiResult }) => {
  if (!aiResult.aiInsights) {
    return null;
  }

  const { aiInsights } = aiResult;

  return (
    <div className="relative rounded-lg p-px">
      <GlowEffect
        colors={AI_INSIGHTS_GLOW_COLORS}
        mode="colorShift"
        blur="soft"
        duration={8}
      />

      <div className="bg-card relative space-y-3 rounded-lg p-3">
        <p className="text-sm font-medium">{aiInsights.summary}</p>

        <div className="text-sm">
          <span className="font-medium">
            {m.comparator_ai_recommendation_label()}
          </span>{" "}
          {m.comparator_ai_recommendation_value({
            decision: resolveRecommendationDecisionLabel(
              aiInsights.recommendation.decision,
            ),
            confidence: resolveRecommendationConfidenceLabel(
              aiInsights.recommendation.confidence,
            ),
          })}
        </div>

        <div className="text-muted-foreground text-sm">
          <span className="text-foreground font-medium">
            {m.comparator_ai_rationale_label()}
          </span>{" "}
          {aiInsights.recommendation.rationale}
        </div>

        <div className="text-sm">
          <span className="font-medium">
            {m.comparator_ai_price_significance_label()}
          </span>{" "}
          {m.comparator_ai_price_significance_value({
            level: resolvePriceLevelLabel(aiInsights.priceSignificance.level),
          })}
        </div>
        <p className="text-muted-foreground text-sm">
          {aiInsights.priceSignificance.explanation}
        </p>

        <div className="text-sm">
          <span className="font-medium">
            {m.comparator_ai_commitment_label()}
          </span>{" "}
          {m.comparator_ai_commitment_value({
            term: resolveCommitmentTermLabel(
              aiInsights.annualCommitmentAdvice.term,
            ),
            confidence: resolveRecommendationConfidenceLabel(
              aiInsights.annualCommitmentAdvice.confidence,
            ),
          })}
        </div>
        <p className="text-muted-foreground text-sm">
          {aiInsights.annualCommitmentAdvice.reason}
        </p>

        <div className="grid gap-2 md:grid-cols-2">
          <div className="rounded-lg border p-2">
            <p className="text-xs font-medium uppercase">
              {m.comparator_ai_maturity_current_label()}
            </p>
            <p className="mt-1 text-sm">
              {resolveMaturityLevelLabel(
                aiInsights.serviceMaturity.current.level,
              )}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              {aiInsights.serviceMaturity.current.reason}
            </p>
          </div>
          <div className="rounded-lg border p-2">
            <p className="text-xs font-medium uppercase">
              {m.comparator_ai_maturity_candidate_label()}
            </p>
            <p className="mt-1 text-sm">
              {resolveMaturityLevelLabel(
                aiInsights.serviceMaturity.candidate.level,
              )}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              {aiInsights.serviceMaturity.candidate.reason}
            </p>
          </div>
        </div>

        {aiInsights.risks.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {m.comparator_ai_risks_label()}
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {aiInsights.risks.map((risk) => (
                <li key={risk}>{risk}</li>
              ))}
            </ul>
          </div>
        )}

        {aiInsights.uncertainties.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {m.comparator_ai_uncertainties_label()}
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {aiInsights.uncertainties.map((uncertainty) => (
                <li key={uncertainty}>{uncertainty}</li>
              ))}
            </ul>
          </div>
        )}

        {aiInsights.citations.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {m.comparator_ai_sources_label()}
            </p>
            <div className="flex flex-col gap-1">
              {aiInsights.citations.map((citation) => (
                <a
                  key={citation.url}
                  href={citation.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
                >
                  {citation.title}
                  <ExternalLink className="size-3" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const SubscriptionComparatorAiInsightsCard: FC<
  SubscriptionComparatorAiInsightsCardProps
> = ({
  aiResult,
  aiQuota,
  canAnalyze,
  isAnalyzePending,
  isAiQuotaReached,
  onAnalyze,
}) => {
  const isAiAlreadyGenerated = Boolean(
    aiResult?.mode === "ai" && aiResult.aiInsights,
  );
  const analyzeDisabledReason = isAiAlreadyGenerated
    ? m.comparator_ai_already_generated_tooltip()
    : isAiQuotaReached
      ? m.comparator_ai_quota_reached()
      : !canAnalyze
        ? m.comparator_ai_requires_compare()
        : null;
  const isAnalyzeDisabled = Boolean(analyzeDisabledReason) || isAnalyzePending;

  return (
    <Card className="rounded-2xl border-dashed">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              {m.comparator_ai_title()}
            </CardTitle>
            <CardDescription>{m.comparator_ai_description()}</CardDescription>
          </div>
          {aiQuota && <AiQuotaBadge usage={aiQuota} />}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <AnalyzeButton
          disabledReason={analyzeDisabledReason}
          isAnalyzePending={isAnalyzePending}
          isAnalyzeDisabled={isAnalyzeDisabled}
          onAnalyze={onAnalyze}
        />

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
