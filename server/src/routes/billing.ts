import { Hono } from "hono";
import {
  FREE_COMPARATOR_AI_MONTHLY_LIMIT,
  FREE_COMPARATOR_MONTHLY_LIMIT,
  PLAN_FEATURE_LABELS,
  PLANS,
  PLUS_COMPARATOR_AI_MONTHLY_LIMIT,
  type PlansResponse,
} from "shared";
import { BillingService } from "../domains/billing/billingService";
import { PaddleBillingService } from "../domains/billing/paddle/paddleBillingService";
import { protect } from "../middleware/auth";
import { requireUserId } from "../utils/authUtils";
import { handleServiceError } from "../utils/routeUtils";

type BillingBindings = {
  PLANS_API_KEY: string;
  PADDLE_PLUS_PRODUCT_ID: string;
};

export const billingRouter = new Hono<{ Bindings: BillingBindings }>()
  .get("/plans", async (context) => {
    const apiKey = context.req.header("x-api-key");
    const expectedKey = context.env.PLANS_API_KEY;

    if (!expectedKey || apiKey !== expectedKey) {
      return context.json({ error: "Unauthorized" }, 401 as const);
    }

    return context.json(
      {
        plans: PLANS,
        quotas: {
          free: {
            comparatorAiMonthly: FREE_COMPARATOR_AI_MONTHLY_LIMIT,
            comparatorMonthly: FREE_COMPARATOR_MONTHLY_LIMIT,
          },
          plus: {
            comparatorAiMonthly: PLUS_COMPARATOR_AI_MONTHLY_LIMIT,
            comparatorMonthly: null,
          },
        },
        featureLabels: PLAN_FEATURE_LABELS,
      } satisfies PlansResponse,
      200,
      { "Cache-Control": "public, max-age=3600", Vary: "X-Api-Key" },
    );
  })
  .get("/usage", protect, async (context) => {
    const userId = requireUserId(context);

    try {
      const usage = await BillingService.getUsage(userId);
      return context.json(usage);
    } catch (error) {
      return handleServiceError(context, error);
    }
  })
  .post("/checkout", protect, async (context) => {
    const userId = requireUserId(context);

    try {
      const response = await PaddleBillingService.createCheckoutTransaction(
        userId,
        context.env,
      );
      return context.json(response, 200);
    } catch (error) {
      return handleServiceError(context, error);
    }
  })
  .post("/portal", protect, async (context) => {
    const userId = requireUserId(context);

    try {
      const response =
        await PaddleBillingService.createCustomerPortalUrl(userId);
      return context.json(response, 200);
    } catch (error) {
      return handleServiceError(context, error);
    }
  });
