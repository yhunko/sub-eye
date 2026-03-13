import { useEffect, useMemo, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type {
  AnalyzeComparatorResponseDto,
  CompareSubscriptionsInput,
  CompareSubscriptionsResponseDto,
} from "shared";
import { CurrenciesMap, CurrencyUtils } from "shared";
import { subscriptionsQuery } from "@/entities/subscription";
import { planUsageQuery } from "@/entities/billing";
import {
  comparatorRatesQuery,
  useAnalyzeComparator,
  useCompareSubscriptions,
} from "@/entities/comparator";
import * as m from "@/i18n/messages";
import {
  parseManualPlanDraft,
  type ManualDraftChangeHandler,
  type ManualPlanDraft,
} from "./comparator-form";
import {
  buildCandidatePreview,
  buildCurrentPreview,
  toPreferredCurrencyConverter,
} from "./comparator-plan-preview";
import type {
  ComparatorWizardComparisonState,
  ComparatorWizardPersistentState,
  ComparatorWizardStep,
} from "./comparator-wizard-persistence";
import type {
  CompareMode,
  SelectableSubscriptionOption,
} from "../ui/wizard/subscription-comparator-wizard.types";

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
  if (value <= 1) {
    return 1;
  }

  if (value >= 4) {
    return 4;
  }

  return value as 2 | 3;
};

export const useSubscriptionComparatorWizardState = ({
  prefillSubscriptionId,
  persistedState,
  onPersistedStateChange,
}: SubscriptionComparatorWizardStateParams) => {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { user } = useUser();

  const [step, setStep] = useState<number>(persistedState.step);
  const [mode, setMode] = useState<CompareMode>(persistedState.mode);
  const [currentExistingId, setCurrentExistingId] = useState(
    persistedState.currentExistingId,
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

  useEffect(() => {
    onPersistedStateChange?.({
      step: toWizardStep(step),
      mode,
      currentExistingId,
      currentManual,
      candidateManual,
      comparison,
    });
  }, [
    candidateManual,
    comparison,
    currentExistingId,
    currentManual,
    mode,
    onPersistedStateChange,
    step,
  ]);

  const { data: subscriptions = [] } = useQuery(
    subscriptionsQuery({
      params: {
        userId: userId ?? "",
        queryParams: { status: "all" },
      },
      options: { enabled: Boolean(userId) },
    }),
  );
  const { data: usage } = useQuery(
    planUsageQuery({
      params: { userId: userId ?? "" },
      options: { enabled: Boolean(userId) },
    }),
  );
  const { data: ratesFromQuery } = useQuery(
    comparatorRatesQuery({
      params: { userId: userId ?? "" },
      options: { enabled: Boolean(userId) },
    }),
  );
  const compareMutation = useCompareSubscriptions();
  const analyzeMutation = useAnalyzeComparator();

  const selectableSubscriptions = useMemo(() => {
    const filtered = subscriptions.filter(
      (subscription) =>
        subscription.status === "active" ||
        subscription.status === "cancelledButActive" ||
        subscription.id === prefillSubscriptionId,
    );

    return filtered.sort((left, right) => left.name.localeCompare(right.name));
  }, [subscriptions, prefillSubscriptionId]);

  const selectedExistingSubscription = useMemo(
    () =>
      selectableSubscriptions.find(
        (subscription) => subscription.id === currentExistingId,
      ),
    [selectableSubscriptions, currentExistingId],
  );

  const selectableSubscriptionOptions = useMemo<
    SelectableSubscriptionOption[]
  >(() => {
    return selectableSubscriptions.map(({ id, name }) => ({ id, name }));
  }, [selectableSubscriptions]);

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
  const aiQuota = usage?.comparatorAiInsights;
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
    setSessionState((previous) => ({ ...previous, errorMessage: null }));
  };

  const resetComparisonState = () => {
    setSessionState((previous) => ({
      ...previous,
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
    setSessionState((previous) => ({
      ...previous,
      comparison: { payload, response },
      aiResult: undefined,
    }));
  };

  const updateManualDraft = (
    key: keyof ManualDraftsState,
    next: Parameters<ManualDraftChangeHandler>[0],
  ) => {
    resetComparisonState();
    setManualDrafts((previous) => ({
      ...previous,
      [key]: {
        ...previous[key],
        ...(typeof next === "function" ? next(previous[key]) : next),
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
      setSessionState((previous) => ({
        ...previous,
        errorMessage: m.validation_required(),
      }));
      return;
    }

    if (mode === "manualVsManual") {
      const current = parseManualPlanDraft(currentManual);
      if (current.error) {
        setSessionState((previous) => ({
          ...previous,
          errorMessage: m.validation_positive_number(),
        }));
        return;
      }
    }

    goToStep(3);
  };

  const goFromStepThree = () => {
    const candidate = parseManualPlanDraft(candidateManual);
    if (candidate.error) {
      setSessionState((previous) => ({
        ...previous,
        errorMessage: m.validation_positive_number(),
      }));
      return;
    }

    goToStep(4);
  };

  const handleCompare = async () => {
    if (isQuotaReached) {
      setSessionState((previous) => ({
        ...previous,
        errorMessage: m.comparator_quota_reached(),
      }));
      return;
    }

    const candidate = parseManualPlanDraft(candidateManual);
    if (candidate.error || !candidate.payload) {
      setSessionState((previous) => ({
        ...previous,
        errorMessage: m.validation_positive_number(),
      }));
      return;
    }

    let currentPlan: CompareSubscriptionsInput["currentPlan"];
    if (mode === "existingVsManual") {
      if (!currentExistingId) {
        setSessionState((previous) => ({
          ...previous,
          errorMessage: m.validation_required(),
        }));
        return;
      }

      currentPlan = {
        source: "existing",
        subscriptionId: currentExistingId,
      };
    } else {
      const currentManualPayload = parseManualPlanDraft(currentManual);
      if (currentManualPayload.error || !currentManualPayload.payload) {
        setSessionState((previous) => ({
          ...previous,
          errorMessage: m.validation_positive_number(),
        }));
        return;
      }

      currentPlan = currentManualPayload.payload;
    }

    const payload: CompareSubscriptionsInput = {
      currentPlan,
      candidatePlan: candidate.payload,
    };

    setSessionState((previous) => ({
      ...previous,
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
        setSessionState((previous) => ({ ...previous, errorMessage: message }));
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
      setSessionState((previous) => ({
        ...previous,
        errorMessage: m.comparator_ai_requires_compare(),
      }));
      return;
    }

    if (isAiQuotaReached) {
      setSessionState((previous) => ({
        ...previous,
        errorMessage: m.comparator_ai_quota_reached(),
      }));
      return;
    }

    clearErrorMessage();

    await analyzeMutation
      .mutateAsync({
        comparison: shownPayload,
      })
      .then((response) => {
        setSessionState((previous) => ({ ...previous, aiResult: response }));
      })
      .catch((error) => {
        const message =
          error instanceof Error
            ? error.message
            : m.comparator_ai_error_generic();
        setSessionState((previous) => ({ ...previous, errorMessage: message }));
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
      buildCandidatePreview({
        candidateManual,
        convertToPreferredCurrency,
        preferredCurrencyCode,
      }),
    [candidateManual, convertToPreferredCurrency, preferredCurrencyCode],
  );

  const handleCurrentExistingChange = (value: string) => {
    resetComparisonState();
    setCurrentExistingId(value);
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
