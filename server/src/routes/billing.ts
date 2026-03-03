import { Hono } from "hono";
import { BillingService } from "../domains/billing/billingService";
import { PaddleBillingService } from "../domains/billing/paddle/paddleBillingService";
import { requireUserId } from "../utils/authUtils";
import { protect } from "../middleware/auth";

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
      if (error instanceof Error) {
        return context.json(
          { error: "Usage Error", message: error.message },
          500,
        );
      }
      return context.json({ error: "Internal Server Error" }, 500);
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
      if (error instanceof Error) {
        return context.json(
          { error: "Checkout Error", message: error.message },
          500,
        );
      }
      return context.json({ error: "Internal Server Error" }, 500);
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
      if (error instanceof Error) {
        return context.json(
          { error: "Portal Error", message: error.message },
          500,
        );
      }
      return context.json({ error: "Internal Server Error" }, 500);
    }
  });
