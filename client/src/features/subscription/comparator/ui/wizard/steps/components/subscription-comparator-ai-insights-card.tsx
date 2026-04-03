import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronUp,
  DollarSign,
  ExternalLink,
  HelpCircle,
  Info,
  Loader2,
  Lock,
  Minus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { type FC, useEffect, useState } from "react";
import type {
  AnalyzeComparatorResponseDto,
  ComparatorAiRiskDto,
  MonthlyUsage,
} from "shared";
import { PlanFeatureLockCard } from "@/entities/billing/ui/plan-feature-lock-card";
import * as m from "@/i18n/messages";
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
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components";
import { cn } from "@/shared/lib/classes-utils";
import { AiQuotaBadge } from "@/shared/ui";

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

const resolveRiskSeverityLabel = (
  severity: ComparatorAiRiskDto["severity"],
): string => {
  switch (severity) {
    case "high":
      return m.comparator_ai_risk_severity_high();
    case "medium":
      return m.comparator_ai_risk_severity_medium();
    case "low":
      return m.comparator_ai_risk_severity_low();
    default:
      return severity;
  }
};

const DECISION_STYLES: Record<
  RecommendationDecision,
  { banner: string; text: string; icon: FC<{ className?: string }> }
> = {
  switch: {
    banner:
      "bg-emerald-500/10 border-emerald-500/30 dark:bg-emerald-500/10 dark:border-emerald-500/30",
    text: "text-emerald-700 dark:text-emerald-400",
    icon: TrendingDown,
  },
  keep: {
    banner:
      "bg-amber-500/10 border-amber-500/30 dark:bg-amber-500/10 dark:border-amber-500/30",
    text: "text-amber-700 dark:text-amber-400",
    icon: TrendingUp,
  },
  trial_first: {
    banner:
      "bg-blue-500/10 border-blue-500/30 dark:bg-blue-500/10 dark:border-blue-500/30",
    text: "text-blue-700 dark:text-blue-400",
    icon: Sparkles,
  },
  depends: {
    banner:
      "bg-slate-500/10 border-slate-400/30 dark:bg-slate-500/10 dark:border-slate-400/30",
    text: "text-slate-600 dark:text-slate-400",
    icon: Minus,
  },
};

const PRICE_LEVEL_STYLES: Record<PriceSignificanceLevel, string> = {
  negligible: "bg-muted text-muted-foreground",
  moderate: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  material: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

const RISK_SEVERITY_STYLES: Record<
  ComparatorAiRiskDto["severity"],
  { row: string; icon: string; badge: string }
> = {
  high: {
    row: "bg-red-500/8 border border-red-500/20",
    icon: "text-red-500",
    badge: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
  medium: {
    row: "bg-amber-500/8 border border-amber-500/20",
    icon: "text-amber-500",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  low: {
    row: "bg-muted/40 border border-border/50",
    icon: "text-muted-foreground",
    badge: "bg-muted text-muted-foreground",
  },
};

const SEVERITY_ORDER: Record<ComparatorAiRiskDto["severity"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const MATURITY_STYLES: Record<MaturityLevel, string> = {
  high: "text-emerald-600 dark:text-emerald-400",
  medium: "text-amber-600 dark:text-amber-400",
  low: "text-red-600 dark:text-red-400",
  unknown: "text-muted-foreground",
};

const getMaturityTextColor = (level: MaturityLevel): string =>
  MATURITY_STYLES[level] ?? MATURITY_STYLES.unknown;

const MaturityDots: FC<{ level: MaturityLevel }> = ({ level }) => {
  const filledCount =
    level === "high" ? 3 : level === "medium" ? 2 : level === "low" ? 1 : 0;

  return (
    <span className="inline-flex gap-0.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            "size-2 rounded-full",
            i < filledCount
              ? "bg-current opacity-100"
              : "bg-current opacity-20",
          )}
        />
      ))}
    </span>
  );
};

const ANALYZING_STEPS = [
  m.comparator_ai_analyzing_step_1,
  m.comparator_ai_analyzing_step_2,
  m.comparator_ai_analyzing_step_3,
  m.comparator_ai_analyzing_step_4,
] as const;

const AnalyzingProgress: FC = () => {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % ANALYZING_STEPS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const StepFn = ANALYZING_STEPS[stepIndex];

  return (
    <div className="space-y-2 rounded-lg border border-dashed p-4">
      <div className="flex items-center gap-2">
        <Loader2 className="text-muted-foreground size-4 shrink-0 animate-spin" />
        <p className="text-sm font-medium">{StepFn()}</p>
      </div>
      <p className="text-muted-foreground text-xs">
        {m.comparator_ai_analyzing_hint()}
      </p>
    </div>
  );
};

const UserIntentNoteInput: FC<{
  value: string;
  onChange: (note: string) => void;
  disabled: boolean;
}> = ({ value, onChange, disabled }) => {
  const remainingChars = 280 - value.length;

  return (
    <div className="space-y-1.5">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={m.comparator_ai_prompt_placeholder()}
        disabled={disabled}
        className="min-h-[60px] resize-none text-sm"
        maxLength={280}
      />
      <p className="text-muted-foreground text-xs">
        {m.comparator_ai_prompt_chars({ count: String(remainingChars) })}
      </p>
    </div>
  );
};

const RegenerateButton: FC<{
  isAnalyzePending: boolean;
  isAnalyzeDisabled: boolean;
  onAnalyze: () => void;
}> = ({ isAnalyzePending, isAnalyzeDisabled, onAnalyze }) => {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onAnalyze}
      disabled={isAnalyzeDisabled}
    >
      <RotateCcw />
      {isAnalyzePending
        ? m.comparator_ai_action_loading()
        : m.comparator_ai_regenerate()}
    </Button>
  );
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
  const [citationsOpen, setCitationsOpen] = useState(false);

  if (!aiResult.aiInsights) {
    return null;
  }

  const { aiInsights } = aiResult;
  const decision = aiInsights.recommendation.decision as RecommendationDecision;
  const confidence = aiInsights.recommendation
    .confidence as RecommendationConfidence;
  const decisionStyle = DECISION_STYLES[decision] ?? DECISION_STYLES.depends;
  const DecisionIcon = decisionStyle.icon;

  const sortedRisks = [...aiInsights.risks].sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity as ComparatorAiRiskDto["severity"]] -
      SEVERITY_ORDER[b.severity as ComparatorAiRiskDto["severity"]],
  );

  return (
    <div className="relative rounded-lg p-px">
      <GlowEffect
        colors={AI_INSIGHTS_GLOW_COLORS}
        mode="colorShift"
        blur="soft"
        duration={8}
      />

      <div className="bg-card relative space-y-3 rounded-lg p-2 md:p-3">
        {/* Recommendation banner */}
        <div className="space-y-1.5">
          <div
            className={cn(
              "flex flex-col gap-1.5 rounded-lg border p-3",
              decisionStyle.banner,
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <DecisionIcon
                className={cn("size-4 shrink-0", decisionStyle.text)}
              />
              <span className={cn("text-sm font-semibold", decisionStyle.text)}>
                {resolveRecommendationDecisionLabel(decision)}
              </span>
            </div>
            <p className={cn("text-sm", decisionStyle.text)}>
              {aiInsights.recommendation.rationale}
            </p>
          </div>
          <div className="text-muted-foreground flex items-center gap-1 text-xs">
            <ShieldCheck className="size-3 shrink-0" />
            <span>
              {m.comparator_ai_confidence_label()}:{" "}
              {resolveRecommendationConfidenceLabel(confidence)}
            </span>
          </div>
        </div>

        {/* Summary */}
        <p className="text-sm">{aiInsights.summary}</p>

        {/* Metric cards row */}
        <div className="grid gap-2 md:grid-cols-2">
          {/* Price significance card */}
          <div className="space-y-1.5 rounded-lg border p-2.5">
            <div className="flex items-center gap-1.5">
              <DollarSign className="text-muted-foreground size-3.5" />
              <p className="text-xs font-medium tracking-wide uppercase">
                {m.comparator_ai_price_significance_label()}
              </p>
            </div>
            <span
              className={cn(
                "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                PRICE_LEVEL_STYLES[
                  aiInsights.priceSignificance.level as PriceSignificanceLevel
                ],
              )}
            >
              {resolvePriceLevelLabel(
                aiInsights.priceSignificance.level as PriceSignificanceLevel,
              )}
            </span>
            <p className="text-muted-foreground text-xs">
              {aiInsights.priceSignificance.explanation}
            </p>
          </div>

          {/* Commitment advice card */}
          <div className="space-y-1.5 rounded-lg border p-2.5">
            <div className="flex items-center gap-1.5">
              <Calendar className="text-muted-foreground size-3.5" />
              <p className="text-xs font-medium tracking-wide uppercase">
                {m.comparator_ai_commitment_label()}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                {resolveCommitmentTermLabel(
                  aiInsights.annualCommitmentAdvice.term as CommitmentTerm,
                )}
              </span>
              <span className="text-muted-foreground text-xs">
                {resolveRecommendationConfidenceLabel(
                  aiInsights.annualCommitmentAdvice.confidence,
                )}
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              {aiInsights.annualCommitmentAdvice.reason}
            </p>
          </div>
        </div>

        {/* Service maturity */}
        <div className="space-y-2 rounded-lg border p-2.5">
          <div className="grid gap-2 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                {m.comparator_ai_maturity_current_label()}
              </p>
              <div
                className={cn(
                  "flex items-center gap-2",
                  getMaturityTextColor(
                    aiInsights.serviceMaturity.current.level as MaturityLevel,
                  ),
                )}
              >
                <MaturityDots
                  level={
                    aiInsights.serviceMaturity.current.level as MaturityLevel
                  }
                />
                <span className="text-sm font-medium">
                  {resolveMaturityLevelLabel(
                    aiInsights.serviceMaturity.current.level as MaturityLevel,
                  )}
                </span>
              </div>
              <p className="text-muted-foreground text-xs">
                {aiInsights.serviceMaturity.current.reason}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                {m.comparator_ai_maturity_candidate_label()}
              </p>
              <div
                className={cn(
                  "flex items-center gap-2",
                  getMaturityTextColor(
                    aiInsights.serviceMaturity.candidate.level as MaturityLevel,
                  ),
                )}
              >
                <MaturityDots
                  level={
                    aiInsights.serviceMaturity.candidate.level as MaturityLevel
                  }
                />
                <span className="text-sm font-medium">
                  {resolveMaturityLevelLabel(
                    aiInsights.serviceMaturity.candidate.level as MaturityLevel,
                  )}
                </span>
              </div>
              <p className="text-muted-foreground text-xs">
                {aiInsights.serviceMaturity.candidate.reason}
              </p>
            </div>
          </div>
        </div>

        {/* Risks */}
        {sortedRisks.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium tracking-wide uppercase">
              {m.comparator_ai_risks_label()}
            </p>
            <div className="space-y-1">
              {sortedRisks.map((risk) => {
                const severityStyle =
                  RISK_SEVERITY_STYLES[
                    risk.severity as ComparatorAiRiskDto["severity"]
                  ] ?? RISK_SEVERITY_STYLES.low;
                const RiskIcon = risk.severity === "low" ? Info : AlertTriangle;
                return (
                  <div
                    key={risk.text}
                    className={cn(
                      "flex items-start gap-2 rounded-md px-2.5 py-1.5",
                      severityStyle.row,
                    )}
                  >
                    <RiskIcon
                      className={cn(
                        "mt-0.5 size-3.5 shrink-0",
                        severityStyle.icon,
                      )}
                    />
                    <div className="flex min-w-0 flex-wrap items-start gap-1.5">
                      <span
                        className={cn(
                          "inline-block shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium",
                          severityStyle.badge,
                        )}
                      >
                        {resolveRiskSeverityLabel(
                          risk.severity as ComparatorAiRiskDto["severity"],
                        )}
                      </span>
                      <p className="text-sm">{risk.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Uncertainties */}
        {aiInsights.uncertainties.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium tracking-wide uppercase">
              {m.comparator_ai_uncertainties_label()}
            </p>
            <div className="space-y-1">
              {aiInsights.uncertainties.map((uncertainty) => (
                <div
                  key={uncertainty}
                  className="flex items-start gap-2 rounded-md px-2.5 py-1.5"
                >
                  <HelpCircle className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
                  <p className="text-muted-foreground text-sm">{uncertainty}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Citations */}
        {aiInsights.citations.length > 0 && (
          <div className="border-border/50 border-t pt-2">
            <button
              type="button"
              onClick={() => setCitationsOpen((v) => !v)}
              className="hover:text-foreground text-muted-foreground flex w-full items-center justify-between text-xs font-medium tracking-wide uppercase transition-colors"
            >
              <span>
                {m.comparator_ai_sources_toggle({
                  count: String(aiInsights.citations.length),
                })}
              </span>
              {citationsOpen ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </button>
            {citationsOpen && (
              <div className="mt-2 flex flex-col gap-1">
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
            )}
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
