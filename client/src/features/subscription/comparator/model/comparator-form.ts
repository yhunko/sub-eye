import {
  type CompareSubscriptionsInput,
  CurrencyUtils,
  SubscriptionPeriod,
} from "shared";
import { parsePriceInput } from "@/shared/lib/price-input";

export type ManualPlanDraft = {
  name: string;
  amountInput: string;
  currency: string;
  everyInput: string;
  period: SubscriptionPeriod;
};

export type ManualDraftChangeHandler = (
  next:
    | Partial<ManualPlanDraft>
    | ((previous: ManualPlanDraft) => Partial<ManualPlanDraft>),
) => void;

export type ManualPlanParseError = "invalid_amount" | "invalid_every";

export const createDefaultManualPlanDraft = (): ManualPlanDraft => ({
  name: "",
  amountInput: "",
  currency: "usd",
  everyInput: "1",
  period: SubscriptionPeriod.MONTH,
});

export const parseManualPlanDraft = (
  draft: ManualPlanDraft,
):
  | {
      payload: Extract<
        CompareSubscriptionsInput["currentPlan"],
        { source: "manual" }
      >;
      error: null;
    }
  | { payload: null; error: ManualPlanParseError } => {
  const amount = parsePriceInput(draft.amountInput);
  const every = Number(draft.everyInput);

  if (!Number.isFinite(amount ?? NaN) || !amount || amount <= 0) {
    return {
      payload: null,
      error: "invalid_amount",
    };
  }

  if (!Number.isFinite(every) || every < 1) {
    return {
      payload: null,
      error: "invalid_every",
    };
  }

  return {
    payload: {
      source: "manual",
      name: draft.name.trim() || undefined,
      amount,
      currency: CurrencyUtils.normalizeCode(draft.currency),
      every,
      period: draft.period,
    },
    error: null,
  };
};
