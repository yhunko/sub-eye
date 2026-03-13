import type {
  ComparatorRatesDto,
  SubscriptionDto,
  SubscriptionPeriod,
} from "shared";
import { CurrencyUtils, RecurrenceUtils } from "shared";
import { formatSubscriptionCycle } from "@/entities/subscription";
import * as m from "@/i18n/messages";
import { parseManualPlanDraft, type ManualPlanDraft } from "./comparator-form";
import type {
  CompareMode,
  PlanPreview,
} from "../ui/wizard/subscription-comparator-wizard.types";

const roundMoney = (value: number) => Number(value.toFixed(2));

export type CurrencyConverter = (
  amount: number,
  sourceCurrencyCode: string,
) => number | null;

export const toPreferredCurrencyConverter = (
  preferredCurrencyCode: string,
  ratesData: ComparatorRatesDto | undefined,
): CurrencyConverter => {
  return (amount: number, sourceCurrencyCode: string): number | null => {
    const source = CurrencyUtils.normalizeCode(sourceCurrencyCode);
    const rates = ratesData?.rates ?? {};

    if (source === preferredCurrencyCode) {
      return amount;
    }

    const sourceRate = rates[source];
    if (!sourceRate || !Number.isFinite(sourceRate) || sourceRate <= 0) {
      return null;
    }

    return amount / sourceRate;
  };
};

const resolveManualPlanAmounts = ({
  amount,
  every,
  period,
  sourceCurrencyCode,
  preferredCurrencyCode,
  convertToPreferredCurrency,
}: {
  amount: number;
  every: number;
  period: SubscriptionPeriod;
  sourceCurrencyCode: string;
  preferredCurrencyCode: string;
  convertToPreferredCurrency: CurrencyConverter;
}) => {
  const sourceMonthlyAmount = CurrencyUtils.toMonthly(amount, every, period);
  const sourceYearlyAmount = sourceMonthlyAmount * 12;
  const convertedImmediateCharge = convertToPreferredCurrency(
    amount,
    sourceCurrencyCode,
  );
  const convertedMonthlyAmount = convertToPreferredCurrency(
    sourceMonthlyAmount,
    sourceCurrencyCode,
  );
  const convertedYearlyAmount = convertToPreferredCurrency(
    sourceYearlyAmount,
    sourceCurrencyCode,
  );
  const hasConvertedValues =
    convertedImmediateCharge !== null &&
    convertedMonthlyAmount !== null &&
    convertedYearlyAmount !== null;

  return {
    immediateCharge: hasConvertedValues ? convertedImmediateCharge : amount,
    monthlyAmount: hasConvertedValues
      ? convertedMonthlyAmount
      : sourceMonthlyAmount,
    yearlyAmount: hasConvertedValues
      ? convertedYearlyAmount
      : sourceYearlyAmount,
    currencyCode: hasConvertedValues
      ? preferredCurrencyCode
      : sourceCurrencyCode,
  };
};

const buildManualPreview = ({
  draft,
  fallbackName,
  preferredCurrencyCode,
  convertToPreferredCurrency,
}: {
  draft: ManualPlanDraft;
  fallbackName: string;
  preferredCurrencyCode: string;
  convertToPreferredCurrency: CurrencyConverter;
}): PlanPreview => {
  const parsed = parseManualPlanDraft(draft);
  const parsedPayload = parsed.payload;

  if (parsed.error || !parsedPayload) {
    return {
      name: draft.name.trim() || fallbackName,
      cycleLabel:
        formatSubscriptionCycle(Number(draft.everyInput || 0), draft.period) ??
        null,
      immediateCharge: null,
      monthlyAmount: null,
      yearlyAmount: null,
      currencyCode: preferredCurrencyCode,
      cadenceInMonths: null,
    };
  }

  const converted = resolveManualPlanAmounts({
    amount: parsedPayload.amount,
    every: parsedPayload.every,
    period: parsedPayload.period,
    sourceCurrencyCode: parsedPayload.currency,
    preferredCurrencyCode,
    convertToPreferredCurrency,
  });

  return {
    name: parsedPayload.name || fallbackName,
    cycleLabel:
      formatSubscriptionCycle(parsedPayload.every, parsedPayload.period) ??
      null,
    immediateCharge: roundMoney(converted.immediateCharge),
    monthlyAmount: roundMoney(converted.monthlyAmount),
    yearlyAmount: roundMoney(converted.yearlyAmount),
    currencyCode: converted.currencyCode,
    cadenceInMonths: RecurrenceUtils.intervalToMonths(
      parsedPayload.every,
      parsedPayload.period,
    ),
  };
};

export const buildCurrentPreview = ({
  mode,
  selectedExistingSubscription,
  currentManual,
  convertToPreferredCurrency,
  preferredCurrencyCode,
}: {
  mode: CompareMode;
  selectedExistingSubscription: SubscriptionDto | undefined;
  currentManual: ManualPlanDraft;
  convertToPreferredCurrency: CurrencyConverter;
  preferredCurrencyCode: string;
}): PlanPreview => {
  if (mode === "existingVsManual") {
    if (!selectedExistingSubscription) {
      return {
        name: m.comparator_label_current(),
        cycleLabel: null,
        immediateCharge: null,
        monthlyAmount: null,
        yearlyAmount: null,
        currencyCode: preferredCurrencyCode,
        cadenceInMonths: null,
      };
    }

    const sourceCurrencyCode = CurrencyUtils.normalizeCode(
      selectedExistingSubscription.currency,
    );
    const targetCurrencyCode = CurrencyUtils.normalizeCode(
      selectedExistingSubscription.billing.preferred.currencyCode,
    );
    const canUsePreferredBillingDirectly =
      targetCurrencyCode === preferredCurrencyCode;
    const convertedImmediateCharge = canUsePreferredBillingDirectly
      ? selectedExistingSubscription.billing.preferred.amount
      : convertToPreferredCurrency(
          selectedExistingSubscription.cost,
          sourceCurrencyCode,
        );
    const convertedMonthlyAmount = canUsePreferredBillingDirectly
      ? selectedExistingSubscription.billing.preferred.monthly
      : convertToPreferredCurrency(
          selectedExistingSubscription.billing.original.monthly,
          sourceCurrencyCode,
        );
    const hasConvertedValues =
      convertedImmediateCharge !== null && convertedMonthlyAmount !== null;
    const immediateCharge = hasConvertedValues
      ? convertedImmediateCharge
      : selectedExistingSubscription.cost;
    const monthlyAmount = hasConvertedValues
      ? convertedMonthlyAmount
      : selectedExistingSubscription.billing.original.monthly;
    const yearlyAmount = monthlyAmount * 12;

    return {
      name: selectedExistingSubscription.name,
      cycleLabel:
        formatSubscriptionCycle(
          selectedExistingSubscription.every,
          selectedExistingSubscription.period,
        ) ?? null,
      immediateCharge: roundMoney(immediateCharge),
      monthlyAmount: roundMoney(monthlyAmount),
      yearlyAmount: roundMoney(yearlyAmount),
      currencyCode: hasConvertedValues
        ? preferredCurrencyCode
        : sourceCurrencyCode,
      cadenceInMonths: RecurrenceUtils.intervalToMonths(
        selectedExistingSubscription.every,
        selectedExistingSubscription.period,
      ),
    };
  }

  return buildManualPreview({
    draft: currentManual,
    fallbackName: m.comparator_label_current(),
    preferredCurrencyCode,
    convertToPreferredCurrency,
  });
};

export const buildCandidatePreview = ({
  candidateManual,
  convertToPreferredCurrency,
  preferredCurrencyCode,
}: {
  candidateManual: ManualPlanDraft;
  convertToPreferredCurrency: CurrencyConverter;
  preferredCurrencyCode: string;
}): PlanPreview => {
  return buildManualPreview({
    draft: candidateManual,
    fallbackName: m.comparator_label_candidate(),
    preferredCurrencyCode,
    convertToPreferredCurrency,
  });
};
