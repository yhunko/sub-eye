import { Hono } from "hono";
import { AnalyticsController } from "../domains/analytics/analyticsController";
import { requireUserId, getOrgId } from "../utils/authUtils";
import { protect } from "../middleware/auth";
import { handleServiceError } from "../utils/routeUtils";

export const analyticsRouter = new Hono()
  .get("/dashboard", protect, async (context) => {
    const userId = requireUserId(context);
    const orgId = getOrgId(context);
    try {
      const data = await AnalyticsController.getDashboardAnalytics(
        userId,
        orgId,
      );
      return context.json(data);
    } catch (error) {
      return handleServiceError(context, error);
    }
  })
  .get("/monthly-summary", protect, async (context) => {
    const userId = requireUserId(context);
    const orgId = getOrgId(context);
    try {
      const data = await AnalyticsController.getMonthlySpendSummary(
        userId,
        orgId,
      );
      return context.json(data);
    } catch (error) {
      return handleServiceError(context, error);
    }
  })
  .get("/weekly-renewals", protect, async (context) => {
    const userId = requireUserId(context);
    const orgId = getOrgId(context);
    try {
      const data = await AnalyticsController.getWeeklyRenewalsSummary(
        userId,
        orgId,
      );
      return context.json(data);
    } catch (error) {
      return handleServiceError(context, error);
    }
  });
