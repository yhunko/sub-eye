import {
  BILLING_FEATURE_KEYS,
  type BillingFeatureKey,
  type Plan,
  type PlanId,
} from "./types";

export const DEFAULT_NOTIFICATION_TIME = "10:00" as const;
export const DEFAULT_NOTIFICATION_OFFSET = 1 as const;

export const NOTIFICATION_SCHEDULE_DEFAULTS = {
  notificationTime: DEFAULT_NOTIFICATION_TIME,
  notificationOffset: DEFAULT_NOTIFICATION_OFFSET,
} as const;

export const FREE_PLAN: Plan = {
  id: "free",
  limits: {
    maxSubscriptions: 20,
    maxCategories: 20,
  },
  features: [
    { key: "subscriptions", included: true },
    { key: "analytics", included: true },
    { key: "notifications", included: true },
    { key: "notificationSchedule", included: false },
    { key: "telegramMessageTemplate", included: false },
    { key: "currency", included: true },
    { key: "comparator", included: true },
    { key: "comparatorAiInsights", included: true },
  ],
};

export const PLUS_PLAN: Plan = {
  id: "plus",
  limits: {
    maxSubscriptions: 50,
    maxCategories: null,
  },
  features: [
    { key: "subscriptions", included: true },
    { key: "analytics", included: true },
    { key: "notifications", included: true },
    { key: "notificationSchedule", included: true },
    { key: "telegramMessageTemplate", included: true },
    { key: "currency", included: true },
    { key: "comparator", included: true },
    { key: "comparatorAiInsights", included: true },
  ],
};

export const PLANS: Plan[] = [FREE_PLAN, PLUS_PLAN];

export const DEFAULT_PLAN_ID: PlanId = "free";

const PLAN_BY_ID: Record<PlanId, Plan> = {
  free: FREE_PLAN,
  plus: PLUS_PLAN,
};

export const getPlanById = (planId: PlanId): Plan => PLAN_BY_ID[planId];

export const resolvePlanId = (value: unknown): PlanId =>
  value === "plus" ? "plus" : DEFAULT_PLAN_ID;

export const hasPlanFeature = (
  planId: PlanId,
  featureKey: BillingFeatureKey,
): boolean =>
  getPlanById(planId).features.some(
    (feature) => feature.key === featureKey && feature.included,
  );

export const getPlanFeaturesMap = (
  planId: PlanId,
): Record<BillingFeatureKey, boolean> => {
  const plan = getPlanById(planId);

  return BILLING_FEATURE_KEYS.reduce(
    (acc, key) => {
      acc[key] = plan.features.some(
        (feature) => feature.key === key && feature.included,
      );
      return acc;
    },
    {} as Record<BillingFeatureKey, boolean>,
  );
};
