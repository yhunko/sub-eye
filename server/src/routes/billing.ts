import { Hono } from "hono";
import { BillingService } from "../domains/billing/billingService";
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
  });
