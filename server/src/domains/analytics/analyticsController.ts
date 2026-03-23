import { AnalyticsService } from "./analyticsService";

export class AnalyticsController {
  static async getDashboardAnalytics(userId: string, orgId?: string | null) {
    return AnalyticsService.getDashboardStats(userId, orgId);
  }

  static async getMonthlySpendSummary(userId: string, orgId?: string | null) {
    return AnalyticsService.getMonthlySpendSummary(userId, orgId);
  }

  static async getWeeklyRenewalsSummary(userId: string, orgId?: string | null) {
    return AnalyticsService.getWeeklyRenewalsSummary(userId, orgId);
  }
}
