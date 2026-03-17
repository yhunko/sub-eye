import { Hono } from "hono";
import { BillingService } from "../domains/billing/billingService";
import { PaddleBillingService } from "../domains/billing/paddle/paddleBillingService";
import { requireUserId } from "../utils/authUtils";
import { protect } from "../middleware/auth";
import { handleServiceError } from "../utils/routeUtils";

export const billingRouter = new Hono()
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
