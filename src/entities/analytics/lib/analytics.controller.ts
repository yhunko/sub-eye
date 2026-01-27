import { AnalyticsService } from "./analytics.service";

export class AnalyticsController {
  private service: AnalyticsService;

  constructor(private userId: string) {
    this.service = new AnalyticsService();
  }

  async getDashboardAnalytics() {
    return await this.service.getDashboardStats(this.userId);
  }

  async getMonthlySpendSummary() {
    return await this.service.getMonthlySpendSummary(this.userId);
  }

  async getWeeklyRenewalsSummary() {
    return await this.service.getWeeklyRenewalsSummary(this.userId);
  }
}
