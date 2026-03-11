import type { ComparatorDeltaDto } from "shared";

export type ReviewRecommendation = "current" | "candidate" | "neutral" | null;

export type PlanVisualState = "default" | "recommended" | "muted" | "neutral";

export type PlanStatusTone =
  | "recommended"
  | "higher-cost"
  | "keep"
  | "same-cost";

export type ComparatorReviewVisualState = {
  recommendation: ReviewRecommendation;
  currentPlanState: PlanVisualState;
  currentPlanStatusTone?: PlanStatusTone;
  candidatePlanState: PlanVisualState;
  candidatePlanStatusTone?: PlanStatusTone;
};

const getRecommendation = (
  delta: ComparatorDeltaDto | undefined,
): ReviewRecommendation => {
  if (!delta) {
    return null;
  }

  if (delta.monthlyDelta < 0 || delta.yearlyDelta < 0) {
    return "candidate";
  }

  if (delta.monthlyDelta > 0 || delta.yearlyDelta > 0) {
    return "current";
  }

  return "neutral";
};

export const getComparatorReviewVisualState = (
  delta: ComparatorDeltaDto | undefined,
): ComparatorReviewVisualState => {
  const recommendation = getRecommendation(delta);

  if (recommendation === "candidate") {
    return {
      recommendation,
      currentPlanState: "muted",
      currentPlanStatusTone: "higher-cost",
      candidatePlanState: "recommended",
      candidatePlanStatusTone: "recommended",
    };
  }

  if (recommendation === "current") {
    return {
      recommendation,
      currentPlanState: "recommended",
      currentPlanStatusTone: "keep",
      candidatePlanState: "muted",
      candidatePlanStatusTone: "higher-cost",
    };
  }

  if (recommendation === "neutral") {
    return {
      recommendation,
      currentPlanState: "neutral",
      currentPlanStatusTone: "same-cost",
      candidatePlanState: "neutral",
      candidatePlanStatusTone: "same-cost",
    };
  }

  return {
    recommendation,
    currentPlanState: "default",
    candidatePlanState: "default",
  };
};
