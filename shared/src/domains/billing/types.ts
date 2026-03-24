export type PlanFeature = {
  key: BillingFeatureKey;
  included: boolean;
};

export type PlanLimits = {
  maxSubscriptions: number | null;
  maxCategories: number | null;
  maxFamilyMembers?: number;
};

export type Plan = {
  id: PlanId;
  limits: PlanLimits;
  features: PlanFeature[];
};

export type PlanUsage = {
  planId: PlanId;
  features: Record<BillingFeatureKey, boolean>;
  subscriptions: { current: number; limit: number | null };
  categories: { current: number; limit: number | null };
  comparatorComparisons: MonthlyUsage;
  aiInsights: MonthlyUsage;
};

export type MonthlyUsage = {
  current: number;
  limit: number | null;
  remaining: number | null;
  periodKey: string;
  resetsAt: string;
  isLimited: boolean;
};

export type BillingCheckoutResponse = {
  transactionId: string;
};

export type BillingPortalResponse = {
  url: string;
};

export type PlansResponse = {
  plans: Plan[];
  quotas: {
    free: { comparatorAiMonthly: number; comparatorMonthly: number };
    plus: { comparatorAiMonthly: number; comparatorMonthly: number | null };
  };
};

export type PlanId = (typeof PLAN_IDS)[number];
export type BillingFeatureKey = (typeof BILLING_FEATURE_KEYS)[number];

const BILLING_FEATURE_KEYS = [
  "subscriptions",
  "analytics",
  "notifications",
  "notificationSchedule",
  "telegramMessageTemplate",
  "currency",
  "comparator",
  "aiInsights",
  "familyGroup",
] as const;

const PLAN_IDS = ["free", "plus"] as const;
export { PLAN_IDS };
export { BILLING_FEATURE_KEYS };
