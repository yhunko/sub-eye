import { Hono } from "hono";
import { BillingService } from "../domains/billing/billingService";
import { PaddleBillingService } from "../domains/billing/paddle/paddleBillingService";
import { requireUserId } from "../utils/authUtils";
import { protect } from "../middleware/auth";
import { handleServiceError } from "../utils/routeUtils";
import {
  PLANS,
  FREE_COMPARATOR_AI_MONTHLY_LIMIT,
  FREE_COMPARATOR_MONTHLY_LIMIT,
  PLUS_COMPARATOR_AI_MONTHLY_LIMIT,
  type PlansResponse,
} from "shared";

export const billingRouter = new Hono<{ Bindings: { PLANS_API_KEY: string } }>()
  /**
   * Returns public plan definitions for external consumers (e.g. landing page).
   * Protected by a static API key passed via X-Api-Key header.
   * Set PLANS_API_KEY worker secret: wrangler secret put PLANS_API_KEY
   */
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
      } satisfies PlansResponse,
      200,
      { "Cache-Control": "public, max-age=3600", Vary: "X-Api-Key" },
    );
  })
  /**
   * Returns plan usage and limits for the current user.
   */
  .get("/usage", protect, async (context) => {
    const userId = requireUserId(context);

    try {
      const usage = await BillingService.getUsage(userId);
      return context.json(usage);
    } catch (error) {
      return handleServiceError(context, error);
    }
  })
  /**
   * Creates a Paddle checkout transaction for Plus plan upgrades.
   */
  .post("/checkout", protect, async (context) => {
    const userId = requireUserId(context);

    try {
      const response =
        await PaddleBillingService.createCheckoutTransaction(userId);
      return context.json(response, 200);
    } catch (error) {
      return handleServiceError(context, error);
    }
  })
  /**
   * Creates a Paddle customer portal session URL.
   */
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
