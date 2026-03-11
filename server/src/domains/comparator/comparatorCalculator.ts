import {
  CurrencyUtils,
  type ComparatorDeltaDto,
  type ComparatorPlanMetricsDto,
  type ComparatorPlanInput,
  type ComparatorPortfolioContextDto,
  type SubscriptionPeriod,
} from "shared";

type ResolvedPlan = {
  source: ComparatorPlanInput["source"];
  subscriptionId: string | null;
  name: string;
  amount: number;
  currency: string;
  every: number;
  period: SubscriptionPeriod;
};

const roundMoney = (value: number): number => Number(value.toFixed(2));

export class ComparatorCalculator {
  static toMetrics(
    plan: ResolvedPlan,
    preferredCurrencyCode: string,
    rates: Record<string, number>,
  ): ComparatorPlanMetricsDto {
    const immediateCharge = CurrencyUtils.convert(
      plan.amount,
      plan.currency,
      preferredCurrencyCode,
      rates,
    );
    const monthlyAmount = CurrencyUtils.toMonthly(
      immediateCharge,
      plan.every,
      plan.period,
    );
    const yearlyAmount = monthlyAmount * 12;

    return {
      source: plan.source,
      subscriptionId: plan.subscriptionId,
      name: plan.name,
      every: plan.every,
      period: plan.period,
      currencyCode: preferredCurrencyCode,
      immediateCharge: roundMoney(immediateCharge),
      monthlyAmount: roundMoney(monthlyAmount),
      yearlyAmount: roundMoney(yearlyAmount),
    };
  }

  static toDelta(
    currentPlan: ComparatorPlanMetricsDto,
    candidatePlan: ComparatorPlanMetricsDto,
  ): ComparatorDeltaDto {
    const monthlyDelta =
      candidatePlan.monthlyAmount - currentPlan.monthlyAmount;
    const yearlyDelta = candidatePlan.yearlyAmount - currentPlan.yearlyAmount;

    const monthlyPercent =
      currentPlan.monthlyAmount > 0
        ? (monthlyDelta / currentPlan.monthlyAmount) * 100
        : null;
    const yearlyPercent =
      currentPlan.yearlyAmount > 0
        ? (yearlyDelta / currentPlan.yearlyAmount) * 100
        : null;

    const epsilon = 0.0001;
    const direction =
      Math.abs(monthlyDelta) < epsilon
        ? "neutral"
        : monthlyDelta < 0
          ? "save"
          : "increase";

    return {
      monthlyDelta: roundMoney(monthlyDelta),
      yearlyDelta: roundMoney(yearlyDelta),
      monthlyPercent:
        monthlyPercent === null ? null : Number(monthlyPercent.toFixed(1)),
      yearlyPercent:
        yearlyPercent === null ? null : Number(yearlyPercent.toFixed(1)),
      direction,
    };
  }

  static toPortfolioContext(
    baselineMonthlyTotal: number,
    delta: ComparatorDeltaDto,
  ): ComparatorPortfolioContextDto {
    const currentMonthlyTotal = roundMoney(baselineMonthlyTotal);
    const currentYearlyTotal = roundMoney(currentMonthlyTotal * 12);
    const projectedMonthlyTotal = roundMoney(
      currentMonthlyTotal + delta.monthlyDelta,
    );
    const projectedYearlyTotal = roundMoney(projectedMonthlyTotal * 12);

    return {
      currentMonthlyTotal,
      currentYearlyTotal,
      projectedMonthlyTotal,
      projectedYearlyTotal,
      monthlyDelta: roundMoney(projectedMonthlyTotal - currentMonthlyTotal),
      yearlyDelta: roundMoney(projectedYearlyTotal - currentYearlyTotal),
    };
  }
}
