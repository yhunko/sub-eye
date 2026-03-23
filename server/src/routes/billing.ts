import { Hono } from "hono";
import { BillingService } from "../domains/billing/billingService";
import { PaddleBillingService } from "../domains/billing/paddle/paddleBillingService";
import { requireUserId, getOrgId, requireOrgAdmin } from "../utils/authUtils";
import { protect } from "../middleware/auth";
import { handleServiceError } from "../utils/routeUtils";
import {
  PLANS,
  FREE_COMPARATOR_AI_MONTHLY_LIMIT,
  FREE_COMPARATOR_MONTHLY_LIMIT,
  PLUS_COMPARATOR_AI_MONTHLY_LIMIT,
  type PlansResponse,
} from "shared";

type BillingBindings = {
  PLANS_API_KEY: string;
  PADDLE_PLUS_PRODUCT_ID: string;
  PADDLE_FAMILY_PRODUCT_ID: string;
};

export const billingRouter = new Hono<{ Bindings: BillingBindings }>()
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
   * Returns plan usage and limits for the current user (personal space).
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
   * Returns plan usage and limits for the current org space.
   */
  .get("/org/usage", protect, async (context) => {
    const userId = requireUserId(context);
    const orgId = getOrgId(context);

    if (!orgId) {
      return context.json({ error: "No active organization" }, 400 as const);
    }

    try {
      const usage = await BillingService.getUsage(userId, orgId);
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
      const response = await PaddleBillingService.createCheckoutTransaction(
        userId,
        context.env,
      );
      return context.json(response, 200);
    } catch (error) {
      return handleServiceError(context, error);
    }
  })
  /**
   * Creates a Paddle checkout transaction for Family plan (org billing).
   * Requires org:admin role.
   */
  .post("/org/checkout", protect, async (context) => {
    const userId = requireUserId(context);
    const orgId = getOrgId(context);

    if (!orgId) {
      return context.json({ error: "No active organization" }, 400 as const);
    }

    try {
      requireOrgAdmin(context);
      const response = await PaddleBillingService.createOrgCheckoutTransaction(
        orgId,
        userId,
        context.env,
      );
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
  })
  /**
   * Creates a Paddle customer portal session for the org subscription.
   * Requires org:admin role.
   */
  .post("/org/portal", protect, async (context) => {
    const orgId = getOrgId(context);

    if (!orgId) {
      return context.json({ error: "No active organization" }, 400 as const);
    }

    try {
      requireOrgAdmin(context);
      const response = await PaddleBillingService.createOrgPortalUrl(orgId);
      return context.json(response, 200);
    } catch (error) {
      return handleServiceError(context, error);
    }
  });
