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
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { type FC, useEffect, useState } from "react";
import type { AnalyzeComparatorResponseDto, ComparatorAiRiskDto } from "shared";
import * as m from "@/i18n/messages";
import {
  Button,
  GlowEffect,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components";
import { cn } from "@/shared/lib/classes-utils";
import {
  AI_INSIGHTS_GLOW_COLORS,
  type CommitmentTerm,
  type MaturityLevel,
  type PriceSignificanceLevel,
  type RecommendationConfidence,
  type RecommendationDecision,
  resolveCommitmentTermLabel,
  resolveMaturityLevelLabel,
  resolvePriceLevelLabel,
  resolveRecommendationConfidenceLabel,
  resolveRecommendationDecisionLabel,
  resolveRiskSeverityLabel,
} from "./ai-insights-labels";
import {
  DECISION_STYLES,
  getMaturityTextColor,
  PRICE_LEVEL_STYLES,
  RISK_SEVERITY_STYLES,
  SEVERITY_ORDER,
} from "./ai-insights-styles";

export const MaturityDots: FC<{ level: MaturityLevel }> = ({ level }) => {
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

export const ANALYZING_STEPS = [
  m.comparator_ai_analyzing_step_1,
  m.comparator_ai_analyzing_step_2,
  m.comparator_ai_analyzing_step_3,
  m.comparator_ai_analyzing_step_4,
] as const;

export const AnalyzingProgress: FC = () => {
  const [stepIndex, setStepIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(
      () => setStepIndex((prev) => (prev + 1) % ANALYZING_STEPS.length),
      6000,
    );
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

export const UserIntentNoteInput: FC<{
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

export const RegenerateButton: FC<{
  isAnalyzePending: boolean;
  isAnalyzeDisabled: boolean;
  onAnalyze: () => void;
}> = ({ isAnalyzePending, isAnalyzeDisabled, onAnalyze }) => (
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

export const AnalyzeButton: FC<{
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

export const InsightsContent: FC<{
  aiResult: AnalyzeComparatorResponseDto;
}> = ({ aiResult }) => {
  const [citationsOpen, setCitationsOpen] = useState(false);
  if (!aiResult.aiInsights) return null;
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

        <p className="text-sm">{aiInsights.summary}</p>
        <div className="grid gap-2 md:grid-cols-2">
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
