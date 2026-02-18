export type PlanFeature = {
  key: string;
  included: boolean;
};

export type PlanLimits = {
  maxSubscriptions: number;
};

export type Plan = {
  id: PlanId;
  paddleProductId: string | null;
  limits: PlanLimits;
  features: PlanFeature[];
};

export type PlanUsage = {
  subscriptions: { current: number; limit: number };
};

export type PlanId = (typeof PLAN_IDS)[number];

const PLAN_IDS = ["free"] as const;
export { PLAN_IDS };
