import {
  CompareSubscriptionsInputSchema,
  CompareSubscriptionsResponseDtoSchema,
  SubscriptionPeriod,
  type CompareSubscriptionsInput,
  type CompareSubscriptionsResponseDto,
} from "shared";
import { safeParse } from "valibot";
import { decodeBase64Url, encodeBase64Url } from "@/shared/lib/base64";
import {
  createDefaultManualPlanDraft,
  type ManualPlanDraft,
} from "./comparator-form";

export type CompareMode =
  | "existingVsManual"
  | "manualVsManual"
  | "existingVsExisting";
export type ComparatorWizardStep = 1 | 2 | 3 | 4;

export type ComparatorWizardComparisonState = {
  payload: CompareSubscriptionsInput;
  response: CompareSubscriptionsResponseDto;
};

export type ComparatorWizardPersistentState = {
  step: ComparatorWizardStep;
  mode: CompareMode;
  currentExistingId: string;
  candidateExistingId: string;
  currentManual: ManualPlanDraft;
  candidateManual: ManualPlanDraft;
  comparison: ComparatorWizardComparisonState | null;
};

const COMPARATOR_DRAFT_VERSION = 1 as const;
const COMPARE_MODE_VALUES = [
  "existingVsManual",
  "manualVsManual",
  "existingVsExisting",
] as const;
const VALID_SUBSCRIPTION_PERIODS = new Set(Object.values(SubscriptionPeriod));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isCompareMode = (value: unknown): value is CompareMode =>
  typeof value === "string" &&
  (COMPARE_MODE_VALUES as readonly string[]).includes(value);

const isSubscriptionPeriod = (value: unknown): value is SubscriptionPeriod =>
  typeof value === "string" &&
  VALID_SUBSCRIPTION_PERIODS.has(value as SubscriptionPeriod);

const normalizeWizardStep = (
  value: unknown,
  fallback: ComparatorWizardStep,
): ComparatorWizardStep => {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 4
  ) {
    return fallback;
  }

  return value as ComparatorWizardStep;
};

const normalizeManualPlanDraft = (value: unknown): ManualPlanDraft => {
  const fallback = createDefaultManualPlanDraft();
  if (!isRecord(value)) {
    return fallback;
  }

  return {
    name: typeof value.name === "string" ? value.name : fallback.name,
    amountInput:
      typeof value.amountInput === "string"
        ? value.amountInput
        : fallback.amountInput,
    currency:
      typeof value.currency === "string" ? value.currency : fallback.currency,
    everyInput:
      typeof value.everyInput === "string"
        ? value.everyInput
        : fallback.everyInput,
    period: isSubscriptionPeriod(value.period) ? value.period : fallback.period,
  };
};

const normalizeComparisonState = (
  value: unknown,
): ComparatorWizardComparisonState | null => {
  if (!isRecord(value)) {
    return null;
  }

  const parsedPayload = safeParse(
    CompareSubscriptionsInputSchema,
    value.payload,
  );
  if (!parsedPayload.success) {
    return null;
  }

  const parsedResponse = safeParse(
    CompareSubscriptionsResponseDtoSchema,
    value.response,
  );
  if (!parsedResponse.success) {
    return null;
  }

  return {
    payload: parsedPayload.output,
    response: parsedResponse.output,
  };
};

const areManualDraftsEqual = (
  left: ManualPlanDraft,
  right: ManualPlanDraft,
): boolean =>
  left.name === right.name &&
  left.amountInput === right.amountInput &&
  left.currency === right.currency &&
  left.everyInput === right.everyInput &&
  left.period === right.period;

const arePersistentStatesEqual = (
  left: ComparatorWizardPersistentState,
  right: ComparatorWizardPersistentState,
): boolean =>
  left.step === right.step &&
  left.mode === right.mode &&
  left.currentExistingId === right.currentExistingId &&
  left.candidateExistingId === right.candidateExistingId &&
  areManualDraftsEqual(left.currentManual, right.currentManual) &&
  areManualDraftsEqual(left.candidateManual, right.candidateManual) &&
  JSON.stringify(left.comparison) === JSON.stringify(right.comparison);

export const createDefaultComparatorWizardPersistentState = (
  prefillSubscriptionId?: string,
): ComparatorWizardPersistentState => ({
  step: prefillSubscriptionId ? 2 : 1,
  mode: "existingVsManual",
  currentExistingId: prefillSubscriptionId ?? "",
  candidateExistingId: "",
  currentManual: createDefaultManualPlanDraft(),
  candidateManual: createDefaultManualPlanDraft(),
  comparison: null,
});

export const restoreComparatorWizardPersistentState = ({
  draft,
  prefillSubscriptionId,
}: {
  draft?: string;
  prefillSubscriptionId?: string;
}): ComparatorWizardPersistentState => {
  const fallback = createDefaultComparatorWizardPersistentState(
    prefillSubscriptionId,
  );

  if (!draft) {
    return fallback;
  }

  const decodedDraft = decodeBase64Url(draft);
  if (!decodedDraft) {
    return fallback;
  }

  let parsedDraft: unknown;
  try {
    parsedDraft = JSON.parse(decodedDraft);
  } catch {
    return fallback;
  }

  if (!isRecord(parsedDraft) || parsedDraft.v !== COMPARATOR_DRAFT_VERSION) {
    return fallback;
  }

  return {
    step: normalizeWizardStep(parsedDraft.step, fallback.step),
    mode: isCompareMode(parsedDraft.mode) ? parsedDraft.mode : fallback.mode,
    currentExistingId:
      typeof parsedDraft.currentExistingId === "string"
        ? parsedDraft.currentExistingId
        : fallback.currentExistingId,
    candidateExistingId:
      typeof parsedDraft.candidateExistingId === "string"
        ? parsedDraft.candidateExistingId
        : fallback.candidateExistingId,
    currentManual: normalizeManualPlanDraft(parsedDraft.currentManual),
    candidateManual: normalizeManualPlanDraft(parsedDraft.candidateManual),
    comparison: normalizeComparisonState(parsedDraft.comparison),
  };
};

export const serializeComparatorWizardPersistentState = ({
  state,
  prefillSubscriptionId,
}: {
  state: ComparatorWizardPersistentState;
  prefillSubscriptionId?: string;
}): string | undefined => {
  const fallback = createDefaultComparatorWizardPersistentState(
    prefillSubscriptionId,
  );

  if (arePersistentStatesEqual(state, fallback)) {
    return undefined;
  }

  try {
    return encodeBase64Url(
      JSON.stringify({
        v: COMPARATOR_DRAFT_VERSION,
        step: state.step,
        mode: state.mode,
        currentExistingId: state.currentExistingId,
        candidateExistingId: state.candidateExistingId,
        currentManual: state.currentManual,
        candidateManual: state.candidateManual,
        comparison: state.comparison,
      }),
    );
  } catch {
    return undefined;
  }
};
