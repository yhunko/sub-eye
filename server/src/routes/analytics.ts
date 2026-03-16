import { Hono } from "hono";
import { AnalyticsController } from "../domains/analytics/analyticsController";
import { requireUserId } from "../utils/authUtils";
import { protect } from "../middleware/auth";
import { handleServiceError } from "../utils/routeUtils";

export const analyticsRouter = new Hono()
  .get("/dashboard", protect, async (context) => {
    const userId = requireUserId(context);
    try {
      const data = await AnalyticsController.getDashboardAnalytics(userId);
      return context.json(data);
    } catch (error) {
      return handleServiceError(context, error);
    }
  })
  .get("/monthly-summary", protect, async (context) => {
    const userId = requireUserId(context);
    try {
      const data = await AnalyticsController.getMonthlySpendSummary(userId);
      return context.json(data);
    } catch (error) {
      return handleServiceError(context, error);
    }
  })
  .get("/weekly-renewals", protect, async (context) => {
    const userId = requireUserId(context);
    try {
      const data = await AnalyticsController.getWeeklyRenewalsSummary(userId);
      return context.json(data);
    } catch (error) {
      return handleServiceError(context, error);
    }
  });
