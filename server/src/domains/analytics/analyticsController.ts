import { AnalyticsService } from "./analyticsService";

export class AnalyticsController {
  static async getDashboardAnalytics(userId: string) {
    return AnalyticsService.getDashboardStats(userId);
  }

  static async getMonthlySpendSummary(userId: string) {
    return AnalyticsService.getMonthlySpendSummary(userId);
  }

  static async getWeeklyRenewalsSummary(userId: string) {
    return AnalyticsService.getWeeklyRenewalsSummary(userId);
  }
}
