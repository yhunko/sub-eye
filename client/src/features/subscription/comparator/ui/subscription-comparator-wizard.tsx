import { lazy, Suspense, useEffect, useMemo, useState, type FC } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import type {
  AnalyzeComparatorResponseDto,
  ComparatorRatesDto,
  CompareSubscriptionsInput,
  CompareSubscriptionsResponseDto,
  SubscriptionDto,
} from "shared";
import { CurrenciesMap, CurrencyUtils, RecurrenceUtils } from "shared";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
} from "@/shared/components";
import {
  formatSubscriptionCycle,
  subscriptionsQuery,
} from "@/entities/subscription";
import { planUsageQuery } from "@/entities/billing";
import {
  comparatorRatesQuery,
  useAnalyzeComparator,
  useCompareSubscriptions,
} from "@/entities/comparator";
import { cn } from "@/shared/lib/classes-utils";
import { AiQuotaBadge } from "@/shared/ui";
import * as m from "@/i18n/messages";
import { CheckCircle2, ChevronLeft, Circle } from "lucide-react";
import {
  parseManualPlanDraft,
  type ManualPlanDraft,
} from "../model/comparator-form";
import type {
  ComparatorWizardComparisonState,
  ComparatorWizardPersistentState,
  ComparatorWizardStep,
} from "../model/comparator-wizard-persistence";
import type {
  CompareMode,
  PlanPreview,
  SelectableSubscriptionOption,
} from "./wizard/subscription-comparator-wizard.types";
import { SubscriptionComparatorWizardProvider } from "./wizard/subscription-comparator-wizard-provider";

const roundMoney = (value: number) => Number(value.toFixed(2));

const StepMode = lazy(
  () => import("./wizard/steps/subscription-comparator-step-mode"),
);
const StepCurrent = lazy(
  () => import("./wizard/steps/subscription-comparator-step-current"),
);
const StepCandidate = lazy(
  () => import("./wizard/steps/subscription-comparator-step-candidate"),
);
const StepReview = lazy(
  () => import("./wizard/steps/subscription-comparator-step-review"),
);

type ManualDraftChangeHandler = (
  next:
    | Partial<ManualPlanDraft>
    | ((previous: ManualPlanDraft) => Partial<ManualPlanDraft>),
) => void;

type SubscriptionComparatorWizardProps = {
  prefillSubscriptionId?: string;
  persistedState: ComparatorWizardPersistentState;
  onPersistedStateChange?: (state: ComparatorWizardPersistentState) => void;
};

type ComparatorWizardSessionState = {
  comparison: ComparatorWizardComparisonState | null;
  aiResult: AnalyzeComparatorResponseDto | undefined;
  errorMessage: string | null;
};

type ManualDraftsState = {
  current: ManualPlanDraft;
  candidate: ManualPlanDraft;
};

type CurrencyConverter = ReturnType<typeof toPreferredCurrencyConverter>;

const toWizardStep = (value: number): ComparatorWizardStep => {
  if (value <= 1) {
    return 1;
  }

  if (value >= 4) {
    return 4;
  }

  return value as 2 | 3;
};

const StepBadge: FC<{ index: number; currentStep: number; label: string }> = ({
  index,
  currentStep,
  label,
}) => {
  const done = currentStep > index;
  const active = currentStep === index;

  return (
    <div className="flex min-w-0 items-center gap-2">
      {done ? (
        <CheckCircle2 aria-hidden className="size-4 text-emerald-600" />
      ) : (
        <Circle
          aria-hidden
          className={cn(
            "size-4",
            active ? "fill-primary text-primary" : "text-muted-foreground",
          )}
        />
      )}
      <span
        className={cn(
          "truncate text-xs md:text-sm",
          active ? "text-foreground font-medium" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </div>
  );
};

const toPreferredCurrencyConverter = (
  preferredCurrencyCode: string,
  ratesData: ComparatorRatesDto | undefined,
) => {
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

const buildCurrentPreview = ({
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

  const parsed = parseManualPlanDraft(currentManual);
  const parsedPayload = parsed.payload;

  if (parsed.error || !parsedPayload) {
    return {
      name: currentManual.name.trim() || m.comparator_label_current(),
      cycleLabel:
        formatSubscriptionCycle(
          Number(currentManual.everyInput || 0),
          currentManual.period,
        ) ?? null,
      immediateCharge: null,
      monthlyAmount: null,
      yearlyAmount: null,
      currencyCode: preferredCurrencyCode,
      cadenceInMonths: null,
    };
  }

  const sourceMonthlyAmount = CurrencyUtils.toMonthly(
    parsedPayload.amount,
    parsedPayload.every,
    parsedPayload.period,
  );
  const sourceYearlyAmount = sourceMonthlyAmount * 12;
  const convertedImmediateCharge = convertToPreferredCurrency(
    parsedPayload.amount,
    parsedPayload.currency,
  );
  const convertedMonthlyAmount = convertToPreferredCurrency(
    sourceMonthlyAmount,
    parsedPayload.currency,
  );
  const convertedYearlyAmount = convertToPreferredCurrency(
    sourceYearlyAmount,
    parsedPayload.currency,
  );
  const hasConvertedValues =
    convertedImmediateCharge !== null &&
    convertedMonthlyAmount !== null &&
    convertedYearlyAmount !== null;
  const immediateCharge = hasConvertedValues
    ? convertedImmediateCharge
    : parsedPayload.amount;
  const monthlyAmount = hasConvertedValues
    ? convertedMonthlyAmount
    : sourceMonthlyAmount;
  const yearlyAmount = hasConvertedValues
    ? convertedYearlyAmount
    : sourceYearlyAmount;

  return {
    name: parsedPayload.name || m.comparator_label_current(),
    cycleLabel:
      formatSubscriptionCycle(parsedPayload.every, parsedPayload.period) ??
      null,
    immediateCharge: roundMoney(immediateCharge),
    monthlyAmount: roundMoney(monthlyAmount),
    yearlyAmount: roundMoney(yearlyAmount),
    currencyCode: hasConvertedValues
      ? preferredCurrencyCode
      : parsedPayload.currency,
    cadenceInMonths: RecurrenceUtils.intervalToMonths(
      parsedPayload.every,
      parsedPayload.period,
    ),
  };
};

const buildCandidatePreview = ({
  candidateManual,
  convertToPreferredCurrency,
  preferredCurrencyCode,
}: {
  candidateManual: ManualPlanDraft;
  convertToPreferredCurrency: CurrencyConverter;
  preferredCurrencyCode: string;
}): PlanPreview => {
  const parsed = parseManualPlanDraft(candidateManual);
  const parsedPayload = parsed.payload;

  if (parsed.error || !parsedPayload) {
    return {
      name: candidateManual.name.trim() || m.comparator_label_candidate(),
      cycleLabel:
        formatSubscriptionCycle(
          Number(candidateManual.everyInput || 0),
          candidateManual.period,
        ) ?? null,
      immediateCharge: null,
      monthlyAmount: null,
      yearlyAmount: null,
      currencyCode: preferredCurrencyCode,
      cadenceInMonths: null,
    };
  }

  const sourceMonthlyAmount = CurrencyUtils.toMonthly(
    parsedPayload.amount,
    parsedPayload.every,
    parsedPayload.period,
  );
  const sourceYearlyAmount = sourceMonthlyAmount * 12;
  const convertedImmediateCharge = convertToPreferredCurrency(
    parsedPayload.amount,
    parsedPayload.currency,
  );
  const convertedMonthlyAmount = convertToPreferredCurrency(
    sourceMonthlyAmount,
    parsedPayload.currency,
  );
  const convertedYearlyAmount = convertToPreferredCurrency(
    sourceYearlyAmount,
    parsedPayload.currency,
  );
  const hasConvertedValues =
    convertedImmediateCharge !== null &&
    convertedMonthlyAmount !== null &&
    convertedYearlyAmount !== null;
  const immediateCharge = hasConvertedValues
    ? convertedImmediateCharge
    : parsedPayload.amount;
  const monthlyAmount = hasConvertedValues
    ? convertedMonthlyAmount
    : sourceMonthlyAmount;
  const yearlyAmount = hasConvertedValues
    ? convertedYearlyAmount
    : sourceYearlyAmount;

  return {
    name: parsedPayload.name || m.comparator_label_candidate(),
    cycleLabel:
      formatSubscriptionCycle(parsedPayload.every, parsedPayload.period) ??
      null,
    immediateCharge: roundMoney(immediateCharge),
    monthlyAmount: roundMoney(monthlyAmount),
    yearlyAmount: roundMoney(yearlyAmount),
    currencyCode: hasConvertedValues
      ? preferredCurrencyCode
      : parsedPayload.currency,
    cadenceInMonths: RecurrenceUtils.intervalToMonths(
      parsedPayload.every,
      parsedPayload.period,
    ),
  };
};

export const SubscriptionComparatorWizard: FC<
  SubscriptionComparatorWizardProps
> = ({ prefillSubscriptionId, persistedState, onPersistedStateChange }) => {
  const navigate = useNavigate();
  const router = useRouter();
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

  const handleCurrentManualChange: ManualDraftChangeHandler = (next) => {
    resetComparisonState();
    setManualDrafts((previous) => ({
      ...previous,
      current: {
        ...previous.current,
        ...(typeof next === "function" ? next(previous.current) : next),
      },
    }));
    setSessionState((previous) => ({ ...previous, errorMessage: null }));
  };

  const handleCandidateManualChange: ManualDraftChangeHandler = (next) => {
    resetComparisonState();
    setManualDrafts((previous) => ({
      ...previous,
      candidate: {
        ...previous.candidate,
        ...(typeof next === "function" ? next(previous.candidate) : next),
      },
    }));
    setSessionState((previous) => ({ ...previous, errorMessage: null }));
  };

  const handleModeChange = (nextMode: CompareMode) => {
    setMode(nextMode);
    setStep(1);
    setSessionState((previous) => ({ ...previous, errorMessage: null }));
    resetComparisonState();
  };

  const handleQuit = async () => {
    if (window.history.length > 1) {
      router.history.back();
      return;
    }

    await navigate({ to: "/subscriptions" });
  };

  const goToStep = (targetStep: number) => {
    setStep(targetStep);
    setSessionState((previous) => ({ ...previous, errorMessage: null }));
  };

  const handleBackNavigation = () => {
    if (step > 1) {
      goToStep(step - 1);
      return;
    }

    void handleQuit();
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

    setSessionState((previous) => ({ ...previous, errorMessage: null }));

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

  const result = comparison?.response.result;
  const shownPayload = comparison?.payload ?? null;
  const delta = result?.delta;
  const monthlyPercent = delta?.monthlyPercent ?? null;
  const yearlyPercent = delta?.yearlyPercent ?? null;
  const isSavings = (delta?.monthlyDelta ?? 0) < 0;
  const isIncrease = (delta?.monthlyDelta ?? 0) > 0;

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

  const currentPreview = useMemo<PlanPreview>(
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

  const candidatePreview = useMemo<PlanPreview>(
    () =>
      buildCandidatePreview({
        candidateManual,
        convertToPreferredCurrency,
        preferredCurrencyCode,
      }),
    [candidateManual, convertToPreferredCurrency, preferredCurrencyCode],
  );

  const cadenceInsight = useMemo(() => {
    if (
      currentPreview.cadenceInMonths === null ||
      candidatePreview.cadenceInMonths === null
    ) {
      return null;
    }

    const epsilon = 0.001;
    const deltaMonths =
      candidatePreview.cadenceInMonths - currentPreview.cadenceInMonths;

    if (Math.abs(deltaMonths) < epsilon) {
      return m.comparator_review_frequency_line_same();
    }

    const ratio = Number(
      (
        Math.max(
          currentPreview.cadenceInMonths,
          candidatePreview.cadenceInMonths,
        ) /
        Math.min(
          currentPreview.cadenceInMonths,
          candidatePreview.cadenceInMonths,
        )
      ).toFixed(1),
    );

    if (deltaMonths > 0) {
      return m.comparator_review_frequency_line_less({
        ratio,
      });
    }

    return m.comparator_review_frequency_line_more({
      ratio,
    });
  }, [candidatePreview.cadenceInMonths, currentPreview.cadenceInMonths]);

  const wizardContextValue = {
    mode,
    prefillSubscriptionId,
    currentExistingId,
    selectableSubscriptions: selectableSubscriptionOptions,
    onCurrentExistingChange: (value: string) => {
      resetComparisonState();
      setCurrentExistingId(value);
      setSessionState((previous) => ({
        ...previous,
        errorMessage: null,
      }));
    },
    onClearPrefill: () => {
      resetComparisonState();
      setCurrentExistingId("");
      setSessionState((previous) => ({
        ...previous,
        errorMessage: null,
      }));
    },
    currentManual,
    onCurrentManualChange: handleCurrentManualChange,
    candidateManual,
    onCandidateManualChange: handleCandidateManualChange,
    onModeChange: handleModeChange,
    currentPreview,
    candidatePreview,
    cadenceInsight,
    isPending: compareMutation.isPending,
    result,
    delta,
    monthlyImpactSummary,
    yearlyImpactSummary,
    isSavings,
    isIncrease,
    canAnalyze: Boolean(shownPayload && result),
    isAnalyzePending: analyzeMutation.isPending,
    aiResult,
    aiQuota,
    isAiQuotaReached,
    onAnalyze: handleAnalyze,
  };

  return (
    <div className="w-full space-y-4 pb-8 md:pb-10">
      <Card className="rounded-3xl border shadow-sm">
        <CardHeader className="space-y-3 pb-2 md:space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {compareQuota && (
                <Badge
                  variant={compareQuota.isLimited ? "secondary" : "outline"}
                >
                  {compareQuota.isLimited
                    ? m.comparator_quota_remaining({
                        remaining: String(compareQuota.remaining ?? 0),
                        limit: String(compareQuota.limit ?? 0),
                      })
                    : m.comparator_quota_unlimited()}
                </Badge>
              )}
              {aiQuota && <AiQuotaBadge usage={aiQuota} />}
            </div>
          </div>

          <div>
            <CardTitle className="text-xl md:text-2xl">
              {m.comparator_title()}
            </CardTitle>
            <CardDescription>{m.comparator_description()}</CardDescription>
          </div>

          <Progress value={progressValue} />

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
            <StepBadge
              index={1}
              currentStep={step}
              label={m.comparator_step_mode()}
            />
            <StepBadge
              index={2}
              currentStep={step}
              label={m.comparator_step_current()}
            />
            <StepBadge
              index={3}
              currentStep={step}
              label={m.comparator_step_candidate()}
            />
            <StepBadge
              index={4}
              currentStep={step}
              label={m.comparator_step_review()}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          <SubscriptionComparatorWizardProvider value={wizardContextValue}>
            <div className="sticky top-2 z-10">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-background/95 supports-[backdrop-filter]:bg-background/80 mb-2 h-8 rounded-full px-3 shadow-sm backdrop-blur"
                disabled={compareMutation.isPending}
                onClick={handleBackNavigation}
              >
                <ChevronLeft aria-hidden className="size-4" />
                {step > 1 ? m.common_actions_back() : m.common_actions_cancel()}
              </Button>
            </div>
            <Suspense
              fallback={
                <Card className="rounded-2xl border-dashed">
                  <CardContent className="py-6">
                    <p className="text-muted-foreground text-sm">
                      {m.comparator_computing()}
                    </p>
                  </CardContent>
                </Card>
              }
            >
              {step === 1 && <StepMode />}

              {step === 2 && <StepCurrent />}

              {step === 3 && <StepCandidate />}

              {step === 4 && <StepReview />}
            </Suspense>
          </SubscriptionComparatorWizardProvider>

          {errorMessage && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {showBottomActions && (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
              <div className="flex items-center gap-2">
                {step < 4 ? (
                  <Button
                    type="button"
                    onClick={() => {
                      if (step === 1) {
                        goToStep(2);
                        return;
                      }
                      if (step === 2) {
                        goFromStepTwo();
                        return;
                      }
                      goFromStepThree();
                    }}
                  >
                    {m.common_actions_continue()}
                  </Button>
                ) : (
                  <>
                    {hasResult && shownPayload && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={compareMutation.isPending}
                        onClick={() => {
                          resetComparisonState();
                          setSessionState((previous) => ({
                            ...previous,
                            errorMessage: null,
                          }));
                        }}
                      >
                        {m.comparator_result_clear()}
                      </Button>
                    )}
                    <Button
                      type="button"
                      disabled={compareMutation.isPending || isQuotaReached}
                      onClick={handleCompare}
                    >
                      {m.comparator_action_compare()}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
