import {
  array,
  boolean,
  check,
  integer,
  literal,
  maxLength,
  minLength,
  minValue,
  nullable,
  number,
  optional,
  picklist,
  pipe,
  record,
  strictObject,
  string,
  transform,
  union,
  type InferOutput,
} from "valibot";
import { PLAN_IDS } from "../billing";
import { SubscriptionPeriod } from "../../types";

export const FREE_COMPARATOR_MONTHLY_LIMIT = 10;
export const FREE_COMPARATOR_AI_MONTHLY_LIMIT = 10;
export const PLUS_COMPARATOR_AI_MONTHLY_LIMIT = 300;
export const COMPARATOR_AI_MODEL = "gemini-2.5-flash-lite";
export const COMPARATOR_AI_MODEL_PLUS = "gemini-2.5-flash";
export const COMPARATOR_AI_PROMPT_VERSION = "v7";

const currencyCodeSchema = pipe(
  string(),
  transform((value) => value.trim().toLowerCase()),
  minLength(3),
);

const subscriptionPeriodSchema = picklist([
  SubscriptionPeriod.DAY,
  SubscriptionPeriod.WEEK,
  SubscriptionPeriod.MONTH,
  SubscriptionPeriod.YEAR,
]);

const positiveAmountSchema = pipe(
  number(),
  check((value) => Number.isFinite(value) && value > 0, "Amount must be > 0"),
);

const positiveIntegerSchema = pipe(number(), integer(), minValue(1));

const optionalPlanNameSchema = optional(
  pipe(
    string(),
    transform((value) => value.trim()),
  ),
);

export const ManualComparatorPlanInputSchema = strictObject({
  source: literal("manual"),
  name: optionalPlanNameSchema,
  amount: positiveAmountSchema,
  currency: currencyCodeSchema,
  every: optional(positiveIntegerSchema, 1),
  period: optional(subscriptionPeriodSchema, SubscriptionPeriod.MONTH),
});

export const ExistingComparatorPlanInputSchema = strictObject({
  source: literal("existing"),
  subscriptionId: pipe(
    string(),
    transform((value) => value.trim()),
    minLength(1),
  ),
  name: optionalPlanNameSchema,
});

export const ComparatorPlanInputSchema = union([
  ManualComparatorPlanInputSchema,
  ExistingComparatorPlanInputSchema,
]);

export const CompareSubscriptionsInputSchema = strictObject({
  currentPlan: ComparatorPlanInputSchema,
  candidatePlan: ComparatorPlanInputSchema,
});

export const ComparatorPlanMetricsDtoSchema = strictObject({
  source: picklist(["manual", "existing"]),
  subscriptionId: nullable(string()),
  name: string(),
  every: number(),
  period: subscriptionPeriodSchema,
  currencyCode: string(),
  immediateCharge: number(),
  monthlyAmount: number(),
  yearlyAmount: number(),
});

export const ComparatorDeltaDtoSchema = strictObject({
  monthlyDelta: number(),
  yearlyDelta: number(),
  monthlyPercent: nullable(number()),
  yearlyPercent: nullable(number()),
  direction: picklist(["save", "increase", "neutral"]),
});

export const ComparatorPortfolioContextDtoSchema = strictObject({
  currentMonthlyTotal: number(),
  currentYearlyTotal: number(),
  projectedMonthlyTotal: number(),
  projectedYearlyTotal: number(),
  monthlyDelta: number(),
  yearlyDelta: number(),
});

export const ComparatorResultDtoSchema = strictObject({
  preferredCurrencyCode: string(),
  currentPlan: ComparatorPlanMetricsDtoSchema,
  candidatePlan: ComparatorPlanMetricsDtoSchema,
  delta: ComparatorDeltaDtoSchema,
  portfolioContext: ComparatorPortfolioContextDtoSchema,
});

export const ComparatorQuotaDtoSchema = strictObject({
  planId: picklist(PLAN_IDS),
  periodKey: string(),
  resetsAt: string(),
  used: number(),
  limit: nullable(number()),
  remaining: nullable(number()),
  isLimited: boolean(),
});

export const ComparatorAiQuotaDtoSchema = strictObject({
  planId: picklist(PLAN_IDS),
  periodKey: string(),
  resetsAt: string(),
  used: number(),
  limit: nullable(number()),
  remaining: nullable(number()),
  isLimited: boolean(),
});

export const ComparatorRatesDtoSchema = strictObject({
  baseCurrencyCode: string(),
  rates: record(string(), number()),
});

export const CompareSubscriptionsResponseDtoSchema = strictObject({
  result: ComparatorResultDtoSchema,
  quota: ComparatorQuotaDtoSchema,
});

export const ComparatorAiUserIntentSchema = strictObject({
  focusNote: optional(
    pipe(
      string(),
      transform((value) => value.trim()),
      maxLength(280),
    ),
  ),
  commitmentPreference: optional(
    picklist(["monthly", "yearly", "undecided"]),
    "undecided",
  ),
  riskTolerance: optional(picklist(["low", "medium", "high"]), "medium"),
});

export const AnalyzeComparatorInputSchema = strictObject({
  comparison: CompareSubscriptionsInputSchema,
  userIntent: optional(ComparatorAiUserIntentSchema),
});

export const ComparatorCoreInsightsDtoSchema = strictObject({
  recommendation: picklist(["switch", "keep", "neutral"]),
  reason: string(),
  priceImpactLevel: picklist(["negligible", "moderate", "material"]),
  monthlyDeltaAbs: number(),
  yearlyDeltaAbs: number(),
});

const confidenceSchema = picklist(["low", "medium", "high"]);

export const ComparatorAiRiskDtoSchema = strictObject({
  text: string(),
  severity: picklist(["low", "medium", "high"]),
});

export type ComparatorAiRiskDto = InferOutput<typeof ComparatorAiRiskDtoSchema>;

export const ComparatorAiCitationDtoSchema = strictObject({
  title: string(),
  url: string(),
});

export const ComparatorAiInsightsDtoSchema = strictObject({
  summary: string(),
  recommendation: strictObject({
    decision: picklist(["switch", "keep", "trial_first", "depends"]),
    confidence: confidenceSchema,
    rationale: string(),
  }),
  priceSignificance: strictObject({
    level: picklist(["negligible", "moderate", "material"]),
    explanation: string(),
  }),
  annualCommitmentAdvice: strictObject({
    term: picklist(["monthly", "yearly", "either"]),
    confidence: confidenceSchema,
    reason: string(),
  }),
  serviceMaturity: strictObject({
    current: strictObject({
      level: picklist(["low", "medium", "high", "unknown"]),
      reason: string(),
    }),
    candidate: strictObject({
      level: picklist(["low", "medium", "high", "unknown"]),
      reason: string(),
    }),
  }),
  risks: array(ComparatorAiRiskDtoSchema),
  citations: array(ComparatorAiCitationDtoSchema),
  uncertainties: array(string()),
});

export const AnalyzeComparatorResponseDtoSchema = strictObject({
  mode: picklist(["ai", "fallback"]),
  cacheHit: boolean(),
  model: string(),
  compared: ComparatorResultDtoSchema,
  coreInsights: ComparatorCoreInsightsDtoSchema,
  aiInsights: nullable(ComparatorAiInsightsDtoSchema),
  quota: ComparatorAiQuotaDtoSchema,
  fallbackReason: nullable(string()),
});

export type ManualComparatorPlanInput = InferOutput<
  typeof ManualComparatorPlanInputSchema
>;
export type ExistingComparatorPlanInput = InferOutput<
  typeof ExistingComparatorPlanInputSchema
>;
export type ComparatorPlanInput = InferOutput<typeof ComparatorPlanInputSchema>;
export type CompareSubscriptionsInput = InferOutput<
  typeof CompareSubscriptionsInputSchema
>;
export type ComparatorPlanMetricsDto = InferOutput<
  typeof ComparatorPlanMetricsDtoSchema
>;
export type ComparatorDeltaDto = InferOutput<typeof ComparatorDeltaDtoSchema>;
export type ComparatorPortfolioContextDto = InferOutput<
  typeof ComparatorPortfolioContextDtoSchema
>;
export type ComparatorResultDto = InferOutput<typeof ComparatorResultDtoSchema>;
export type ComparatorQuotaDto = InferOutput<typeof ComparatorQuotaDtoSchema>;
export type ComparatorRatesDto = InferOutput<typeof ComparatorRatesDtoSchema>;
export type CompareSubscriptionsResponseDto = InferOutput<
  typeof CompareSubscriptionsResponseDtoSchema
>;
export type ComparatorAiQuotaDto = InferOutput<
  typeof ComparatorAiQuotaDtoSchema
>;
export type ComparatorAiUserIntent = InferOutput<
  typeof ComparatorAiUserIntentSchema
>;
export type AnalyzeComparatorInput = InferOutput<
  typeof AnalyzeComparatorInputSchema
>;
export type ComparatorCoreInsightsDto = InferOutput<
  typeof ComparatorCoreInsightsDtoSchema
>;
export type ComparatorAiCitationDto = InferOutput<
  typeof ComparatorAiCitationDtoSchema
>;
export type ComparatorAiInsightsDto = InferOutput<
  typeof ComparatorAiInsightsDtoSchema
>;
export type AnalyzeComparatorResponseDto = InferOutput<
  typeof AnalyzeComparatorResponseDtoSchema
>;
