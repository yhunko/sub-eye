import type { Plan } from "./types";

export const FREE_PLAN: Plan = {
  id: "free",
  paddleProductId: null,
  limits: {
    maxSubscriptions: 20,
  },
  features: [
    { key: "subscriptions", included: true },
    { key: "analytics", included: true },
    { key: "notifications", included: true },
    { key: "currency", included: true },
  ],
};

export const PLANS: Plan[] = [FREE_PLAN];

export const DEFAULT_PLAN_ID = "free" as const;
