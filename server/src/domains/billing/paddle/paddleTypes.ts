export type PaddleEnvironment = "sandbox" | "live";

export type PaddleSubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "paused"
  | "canceled"
  | "inactive"
  | string;

export type PaddleWebhookEvent = {
  event_id: string;
  event_type: string;
  occurred_at: string;
  data: Record<string, unknown>;
};

export type PaddlePrice = {
  id: string;
  productId?: string;
  product_id?: string;
  product?: { id?: string };
  status?: string;
  billingCycle?: {
    interval?: string;
  };
  billing_cycle?: {
    interval?: string;
  };
};

export type PaddleCustomer = {
  id: string;
};

export type PaddleTransaction = {
  id: string;
};

export type PaddlePortalSession = {
  urls?: {
    general?: {
      overview?: string;
    };
  };
};
