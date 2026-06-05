import type { CompareMode } from "../../model/comparator-wizard-persistence";

export type { CompareMode };

export type PlanPreview = {
  name: string;
  cycleLabel: string | null;
  immediateCharge: number | null;
  monthlyAmount: number | null;
  yearlyAmount: number | null;
  currencyCode: string;
  cadenceInMonths: number | null;
};

export type SelectableSubscriptionOption = {
  id: string;
  name: string;
};
