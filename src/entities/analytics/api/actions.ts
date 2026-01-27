"use server";

import { auth } from "@clerk/nextjs/server";
import { AnalyticsController } from "../lib/analytics.controller";
import { MonthlySpendSummaryDto } from "../model/analytics.dtos";

export async function getDashboardAnalyticsAction() {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) throw new Error("Unauthorized");

  const controller = new AnalyticsController(userId);
  return await controller.getDashboardAnalytics();
}

export async function getMonthlySpendSummaryAction(): Promise<MonthlySpendSummaryDto> {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) throw new Error("Unauthorized");

  const controller = new AnalyticsController(userId);
  return await controller.getMonthlySpendSummary();
}
