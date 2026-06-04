import type { ComparatorAiRiskDto } from "@subeye/shared";
import * as m from "@/i18n/messages";

export type RecommendationDecision =
  | "switch"
  | "keep"
  | "trial_first"
  | "depends";
export type RecommendationConfidence = "low" | "medium" | "high";
export type MaturityLevel = "low" | "medium" | "high" | "unknown";
export type PriceSignificanceLevel = "negligible" | "moderate" | "material";
export type CommitmentTerm = "monthly" | "yearly" | "either";

export const AI_INSIGHTS_GLOW_COLORS = [
  "#4285F4",
  "#9B72CB",
  "#D96570",
  "#F2A600",
];

export const resolveFallbackMessage = (reason: string | null): string => {
  if (reason === "quota_exceeded") return m.comparator_ai_fallback_quota();
  if (reason === "provider_unavailable")
    return m.comparator_ai_fallback_provider();
  return m.comparator_ai_fallback_generic();
};

export const resolveRecommendationDecisionLabel = (
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

export const resolveRecommendationConfidenceLabel = (
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

export const resolveMaturityLevelLabel = (level: MaturityLevel): string => {
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

export const resolvePriceLevelLabel = (
  level: PriceSignificanceLevel,
): string => {
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

export const resolveCommitmentTermLabel = (term: CommitmentTerm): string => {
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

export const resolveRiskSeverityLabel = (
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
