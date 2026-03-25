import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "@tanstack/react-router";
import type {
  AnalyzeComparatorResponseDto,
  CompareSubscriptionsInput,
  CompareSubscriptionsResponseDto,
} from "shared";
import { CurrenciesMap, CurrencyUtils } from "shared";
import * as m from "@/i18n/messages";
import {
  parseManualPlanDraft,
  type ManualDraftChangeHandler,
  type ManualPlanDraft,
} from "./comparator-form";
import {
  buildCandidateExistingPreview,
  buildCandidatePreview,
  buildCurrentPreview,
  toPreferredCurrencyConverter,
} from "./comparator-plan-preview";
import type {
  ComparatorWizardComparisonState,
  ComparatorWizardPersistentState,
  ComparatorWizardStep,
  CompareMode,
} from "./comparator-wizard-persistence";
import { useComparatorQueries } from "./use-comparator-queries";

type ComparatorWizardSessionState = {
  comparison: ComparatorWizardComparisonState | null;
  aiResult: AnalyzeComparatorResponseDto | undefined;
  errorMessage: string | null;
};

type ManualDraftsState = {
  current: ManualPlanDraft;
  candidate: ManualPlanDraft;
};

export type SubscriptionComparatorWizardStateParams = {
  prefillSubscriptionId?: string;
  persistedState: ComparatorWizardPersistentState;
  onPersistedStateChange?: (state: ComparatorWizardPersistentState) => void;
};

const toWizardStep = (value: number): ComparatorWizardStep => {
  if (value <= 1) return 1;
  if (value >= 4) return 4;
  return value as 2 | 3;
};

export const useSubscriptionComparatorWizardState = ({
  prefillSubscriptionId,
  persistedState,
  onPersistedStateChange,
}: SubscriptionComparatorWizardStateParams) => {
  const navigate = useNavigate();
  const { user } = useUser();

  const [step, setStep] = useState<number>(persistedState.step);
  const [mode, setMode] = useState<CompareMode>(persistedState.mode);
  const [currentExistingId, setCurrentExistingId] = useState(
    persistedState.currentExistingId,
  );
  const [candidateExistingId, setCandidateExistingId] = useState(
    persistedState.candidateExistingId,
  );
  const [manualDrafts, setManualDrafts] = useState<ManualDraftsState>({
    current: persistedState.currentManual,
    candidate: persistedState.candidateManual,
  });
  const [sessionState, setSessionState] =
    useState<ComparatorWizardSessionState>({
      comparison: persistedState.comparison,
      aiResult: undefined,
      errorMessage: null,
    });

  const { comparison, aiResult, errorMessage } = sessionState;
  const currentManual = manualDrafts.current;
  const candidateManual = manualDrafts.candidate;

  const {
    subscriptions,
    selectableSubscriptionOptions,
    usage,
    ratesFromQuery,
    compareMutation,
    analyzeMutation,
  } = useComparatorQueries(prefillSubscriptionId);

  useEffect(() => {
    onPersistedStateChange?.({
      step: toWizardStep(step),
      mode,
      currentExistingId,
      candidateExistingId,
      currentManual,
      candidateManual,
      comparison,
    });
  }, [
    candidateExistingId,
    candidateManual,
    comparison,
    currentExistingId,
    currentManual,
    mode,
    onPersistedStateChange,
    step,
  ]);

  const selectedExistingSubscription = useMemo(
    () => subscriptions.find((s) => s.id === currentExistingId),
    [subscriptions, currentExistingId],
  );

  const selectedCandidateExistingSubscription = useMemo(
    () => subscriptions.find((s) => s.id === candidateExistingId),
    [subscriptions, candidateExistingId],
  );

  const preferredCurrencyCode = useMemo(() => {
    const ratesCurrency = CurrencyUtils.normalizeCode(
      ratesFromQuery?.baseCurrencyCode,
    );
    const metadataCurrency = CurrencyUtils.normalizeCode(
      user?.publicMetadata?.preferredCurrency,
    );
    const selectedPreferredCurrency = selectedExistingSubscription
      ? CurrencyUtils.normalizeCode(
          selectedExistingSubscription.billing.preferred.currencyCode,
        )
      : null;

    if (ratesCurrency && CurrenciesMap.has(ratesCurrency)) {
      return ratesCurrency;
    }

    if (metadataCurrency && CurrenciesMap.has(metadataCurrency)) {
      return metadataCurrency;
    }

    if (
      selectedPreferredCurrency &&
      CurrenciesMap.has(selectedPreferredCurrency)
    ) {
      return selectedPreferredCurrency;
    }

    return CurrencyUtils.DEFAULT_CURRENCY_CODE;
  }, [
    ratesFromQuery?.baseCurrencyCode,
    selectedExistingSubscription,
    user?.publicMetadata?.preferredCurrency,
  ]);

  const convertToPreferredCurrency = useMemo(
    () => toPreferredCurrencyConverter(preferredCurrencyCode, ratesFromQuery),
    [preferredCurrencyCode, ratesFromQuery],
  );

  const compareQuota = usage?.comparatorComparisons;
  const aiQuota = usage?.aiInsights;
  const isQuotaReached =
    compareQuota?.isLimited === true && (compareQuota.remaining ?? 0) <= 0;
  const isAiQuotaReached =
    aiQuota?.isLimited === true && (aiQuota.remaining ?? 0) <= 0;

  const progressValue = (step / 4) * 100;
  const hasResult = Boolean(comparison?.response.result);
  const hasFullAiReview = Boolean(
    aiResult?.mode === "ai" && aiResult.aiInsights,
  );
  const showBottomActions = step < 4 || !hasFullAiReview;

  const clearErrorMessage = () => {
    setSessionState((prev) => ({ ...prev, errorMessage: null }));
  };

  const resetComparisonState = () => {
    setSessionState((prev) => ({
      ...prev,
      comparison: null,
      aiResult: undefined,
    }));
    compareMutation.reset();
    analyzeMutation.reset();
  };

  const setComparisonState = (
    payload: CompareSubscriptionsInput,
    response: CompareSubscriptionsResponseDto,
  ) => {
    setSessionState((prev) => ({
      ...prev,
      comparison: { payload, response },
      aiResult: undefined,
    }));
  };

  const updateManualDraft = (
    key: keyof ManualDraftsState,
    next: Parameters<ManualDraftChangeHandler>[0],
  ) => {
    resetComparisonState();
    setManualDrafts((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...(typeof next === "function" ? next(prev[key]) : next),
      },
    }));
    clearErrorMessage();
  };

  const handleCurrentManualChange: ManualDraftChangeHandler = (next) => {
    updateManualDraft("current", next);
  };

  const handleCandidateManualChange: ManualDraftChangeHandler = (next) => {
    updateManualDraft("candidate", next);
  };

  const handleModeChange = (nextMode: CompareMode) => {
    setMode(nextMode);
    setStep(1);
    setCandidateExistingId("");
    clearErrorMessage();
    resetComparisonState();
  };

  const handleExitFlow = async () => {
    await navigate({ to: "/subscriptions" });
  };

  const goToStep = (targetStep: number) => {
    setStep(targetStep);
    clearErrorMessage();
  };

  const handleBackNavigation = () => {
    if (step > 1) {
      goToStep(step - 1);
      return;
    }

    void handleExitFlow();
  };

  const goFromStepTwo = () => {
    if (mode === "existingVsManual" && !currentExistingId) {
      setSessionState((prev) => ({
        ...prev,
        errorMessage: m.validation_required(),
      }));
      return;
    }

    if (mode === "manualVsManual") {
      const current = parseManualPlanDraft(currentManual);
      if (current.error) {
        setSessionState((prev) => ({
          ...prev,
          errorMessage: m.validation_positive_number(),
        }));
        return;
      }
    }

    goToStep(3);
  };

  const goFromStepThree = () => {
    if (mode === "existingVsExisting") {
      if (!candidateExistingId) {
        setSessionState((prev) => ({
          ...prev,
          errorMessage: m.validation_required(),
        }));
        return;
      }
      goToStep(4);
      return;
    }

    const candidate = parseManualPlanDraft(candidateManual);
    if (candidate.error) {
      setSessionState((prev) => ({
        ...prev,
        errorMessage: m.validation_positive_number(),
      }));
      return;
    }

    goToStep(4);
  };

  const handleCompare = async () => {
    if (isQuotaReached) {
      setSessionState((prev) => ({
        ...prev,
        errorMessage: m.comparator_quota_reached(),
      }));
      return;
    }

    let currentPlan: CompareSubscriptionsInput["currentPlan"];
    let candidatePlan: CompareSubscriptionsInput["candidatePlan"];

    if (mode === "existingVsManual" || mode === "existingVsExisting") {
      if (!currentExistingId) {
        setSessionState((prev) => ({
          ...prev,
          errorMessage: m.validation_required(),
        }));
        return;
      }
      currentPlan = { source: "existing", subscriptionId: currentExistingId };
    } else {
      const currentManualPayload = parseManualPlanDraft(currentManual);
      if (currentManualPayload.error || !currentManualPayload.payload) {
        setSessionState((prev) => ({
          ...prev,
          errorMessage: m.validation_positive_number(),
        }));
        return;
      }
      currentPlan = currentManualPayload.payload;
    }

    if (mode === "existingVsExisting") {
      if (!candidateExistingId) {
        setSessionState((prev) => ({
          ...prev,
          errorMessage: m.validation_required(),
        }));
        return;
      }
      candidatePlan = {
        source: "existing",
        subscriptionId: candidateExistingId,
      };
    } else {
      const candidate = parseManualPlanDraft(candidateManual);
      if (candidate.error || !candidate.payload) {
        setSessionState((prev) => ({
          ...prev,
          errorMessage: m.validation_positive_number(),
        }));
        return;
      }
      candidatePlan = candidate.payload;
    }

    const payload: CompareSubscriptionsInput = {
      currentPlan,
      candidatePlan,
    };

    setSessionState((prev) => ({
      ...prev,
      errorMessage: null,
      aiResult: undefined,
    }));

    await compareMutation
      .mutateAsync(payload)
      .then((response) => {
        setComparisonState(payload, response);
      })
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : m.messages_error();
        setSessionState((prev) => ({ ...prev, errorMessage: message }));
      });
  };

  const result = comparison?.response.result;
  const shownPayload = comparison?.payload ?? null;
  const delta = result?.delta;
  const monthlyPercent = delta?.monthlyPercent ?? null;
  const yearlyPercent = delta?.yearlyPercent ?? null;
  const isSavings = (delta?.monthlyDelta ?? 0) < 0;
  const isIncrease = (delta?.monthlyDelta ?? 0) > 0;

  const handleAnalyze = async () => {
    if (!shownPayload) {
      setSessionState((prev) => ({
        ...prev,
        errorMessage: m.comparator_ai_requires_compare(),
      }));
      return;
    }

    if (isAiQuotaReached) {
      setSessionState((prev) => ({
        ...prev,
        errorMessage: m.comparator_ai_quota_reached(),
      }));
      return;
    }

    clearErrorMessage();

    await analyzeMutation
      .mutateAsync({ comparison: shownPayload })
      .then((response) => {
        setSessionState((prev) => ({ ...prev, aiResult: response }));
      })
      .catch((error) => {
        const message =
          error instanceof Error
            ? error.message
            : m.comparator_ai_error_generic();
        setSessionState((prev) => ({ ...prev, errorMessage: message }));
      });
  };

  const monthlyImpactSummary =
    monthlyPercent === null
      ? m.comparator_result_percent_unavailable()
      : monthlyPercent < 0
        ? m.comparator_result_monthly_less({
            value: String(Math.abs(monthlyPercent)),
          })
        : monthlyPercent > 0
          ? m.comparator_result_monthly_more({
              value: String(Math.abs(monthlyPercent)),
            })
          : m.comparator_result_monthly_same();

  const yearlyImpactSummary =
    yearlyPercent === null
      ? m.comparator_result_percent_unavailable()
      : yearlyPercent < 0
        ? m.comparator_result_yearly_less({
            value: String(Math.abs(yearlyPercent)),
          })
        : yearlyPercent > 0
          ? m.comparator_result_yearly_more({
              value: String(Math.abs(yearlyPercent)),
            })
          : m.comparator_result_yearly_same();

  const currentPreview = useMemo(
    () =>
      buildCurrentPreview({
        mode,
        selectedExistingSubscription,
        currentManual,
        convertToPreferredCurrency,
        preferredCurrencyCode,
      }),
    [
      mode,
      selectedExistingSubscription,
      currentManual,
      convertToPreferredCurrency,
      preferredCurrencyCode,
    ],
  );

  const candidatePreview = useMemo(
    () =>
      mode === "existingVsExisting"
        ? buildCandidateExistingPreview({
            selectedCandidateExistingSubscription,
            convertToPreferredCurrency,
            preferredCurrencyCode,
          })
        : buildCandidatePreview({
            candidateManual,
            convertToPreferredCurrency,
            preferredCurrencyCode,
          }),
    [
      mode,
      selectedCandidateExistingSubscription,
      candidateManual,
      convertToPreferredCurrency,
      preferredCurrencyCode,
    ],
  );

  const handleCurrentExistingChange = (value: string) => {
    resetComparisonState();
    setCurrentExistingId(value);
    clearErrorMessage();
  };

  const handleCandidateExistingChange = (value: string) => {
    resetComparisonState();
    setCandidateExistingId(value);
    clearErrorMessage();
  };

  const handleClearPrefill = () => {
    resetComparisonState();
    setCurrentExistingId("");
    clearErrorMessage();
  };

  const handleClearResult = () => {
    resetComparisonState();
    clearErrorMessage();
  };

  const handleContinue = () => {
    if (step === 1) {
      goToStep(2);
      return;
    }

    if (step === 2) {
      goFromStepTwo();
      return;
    }

    goFromStepThree();
  };

  return {
    step,
    mode,
    prefillSubscriptionId,
    currentExistingId,
    candidateExistingId,
    selectableSubscriptionOptions,
    currentManual,
    candidateManual,
    compareQuota,
    aiQuota,
    isQuotaReached,
    isAiQuotaReached,
    isComparePending: compareMutation.isPending,
    isAnalyzePending: analyzeMutation.isPending,
    progressValue,
    hasResult,
    showBottomActions,
    errorMessage,
    result,
    shownPayload,
    delta,
    monthlyImpactSummary,
    yearlyImpactSummary,
    isSavings,
    isIncrease,
    currentPreview,
    candidatePreview,
    aiResult,
    canAnalyze: Boolean(shownPayload && result),
    handleExitFlow,
    goToStep,
    handleBackNavigation,
    handleCurrentExistingChange,
    handleCandidateExistingChange,
    handleClearPrefill,
    handleCurrentManualChange,
    handleCandidateManualChange,
    handleModeChange,
    handleCompare,
    handleAnalyze,
    handleClearResult,
    handleContinue,
  };
};
