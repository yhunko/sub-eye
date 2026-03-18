import { lazy, Suspense, useEffect, useRef, type FC } from "react";
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
import { cn } from "@/shared/lib/classes-utils";
import { AiQuotaBadge } from "@/shared/ui";
import * as m from "@/i18n/messages";
import { CheckCircle2, ChevronLeft, Circle } from "lucide-react";
import {
  useSubscriptionComparatorWizardState,
  type SubscriptionComparatorWizardStateParams,
} from "../model/use-subscription-comparator-wizard-state";
import { track } from "@/shared/lib/analytics";

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

type SubscriptionComparatorWizardProps =
  SubscriptionComparatorWizardStateParams;

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

export const SubscriptionComparatorWizard: FC<
  SubscriptionComparatorWizardProps
> = ({ prefillSubscriptionId, persistedState, onPersistedStateChange }) => {
  const prevStepRef = useRef<number | null>(null);
  const hasTrackedResultRef = useRef(false);

  const {
    step,
    mode,
    currentExistingId,
    selectableSubscriptionOptions,
    currentManual,
    candidateManual,
    compareQuota,
    aiQuota,
    isQuotaReached,
    isAiQuotaReached,
    isComparePending,
    isAnalyzePending,
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
    canAnalyze,
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
  } = useSubscriptionComparatorWizardState({
    prefillSubscriptionId,
    persistedState,
    onPersistedStateChange,
  });

  useEffect(() => {
    track("comparator_opened");
  }, []);

  useEffect(() => {
    if (isQuotaReached) {
      track("comparator_upgrade_prompted", { reason: "quota_exceeded" });
    }
  }, [isQuotaReached]);

  useEffect(() => {
    if (isAiQuotaReached) {
      track("comparator_upgrade_prompted", { reason: "ai_locked" });
    }
  }, [isAiQuotaReached]);

  useEffect(() => {
    const prevStep = prevStepRef.current;
    if (prevStep !== null && step > prevStep) {
      track("comparator_step_completed", {
        step: prevStep as 1 | 2 | 3 | 4,
        ...(prevStep === 1
          ? {
              selection_mode:
                mode === "existingVsManual" ? "existing" : "manual",
            }
          : {}),
      });
    }
    prevStepRef.current = step;
  }, [step, mode]);

  useEffect(() => {
    if (step === 4 && hasResult && !hasTrackedResultRef.current) {
      hasTrackedResultRef.current = true;
      const verdict = isSavings ? "switch" : isIncrease ? "keep" : "neutral";
      track("comparator_completed", { switch_verdict: verdict });
    }
    if (!hasResult) {
      hasTrackedResultRef.current = false;
    }
  }, [step, hasResult, isSavings, isIncrease]);

  return (
    <div className="w-full space-y-3 p-1.5 pb-7 md:space-y-4 md:p-0 md:pb-10">
      <div className="border-border/70 bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-1 z-20 flex items-center justify-between rounded-xl border px-2 py-1.5 shadow-sm md:hidden">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 rounded-lg px-2"
          aria-label={m.common_actions_back()}
          disabled={step <= 1 || isComparePending}
          onClick={() => goToStep(step - 1)}
        >
          <ChevronLeft aria-hidden className="size-4" />
        </Button>
        <p className="truncate px-2 text-sm font-medium">
          {m.comparator_title()}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 rounded-lg px-2 text-xs"
          disabled={isComparePending}
          onClick={() => void handleExitFlow()}
        >
          {m.common_actions_cancel()}
        </Button>
      </div>

      <Card className="border-border/70 rounded-[1.1rem] border shadow-sm md:rounded-3xl">
        <CardHeader className="border-border/60 space-y-3 border-b pb-3 md:space-y-4">
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
              {aiQuota && (
                <AiQuotaBadge
                  usage={aiQuota}
                  analyticsSource="comparator_header"
                />
              )}
            </div>
          </div>

          <div>
            <CardTitle className="text-xl md:text-2xl">
              {m.comparator_title()}
            </CardTitle>
            <CardDescription>{m.comparator_description()}</CardDescription>
          </div>

          <Progress value={progressValue} />

          <div className="border-border/60 grid grid-cols-2 gap-2 rounded-2xl border p-2 md:grid-cols-4 md:gap-3 md:p-3">
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
          <div className="sticky top-2 z-10 hidden md:block">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="bg-background/95 supports-[backdrop-filter]:bg-background/80 mb-2 h-8 rounded-full px-3 shadow-sm backdrop-blur"
              disabled={isComparePending}
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
            {step === 1 && (
              <StepMode mode={mode} onModeChange={handleModeChange} />
            )}

            {step === 2 && (
              <StepCurrent
                mode={mode}
                prefillSubscriptionId={prefillSubscriptionId}
                currentExistingId={currentExistingId}
                selectableSubscriptions={selectableSubscriptionOptions}
                onCurrentExistingChange={handleCurrentExistingChange}
                onClearPrefill={handleClearPrefill}
                currentManual={currentManual}
                onCurrentManualChange={handleCurrentManualChange}
              />
            )}

            {step === 3 && (
              <StepCandidate
                candidateManual={candidateManual}
                onCandidateManualChange={handleCandidateManualChange}
              />
            )}

            {step === 4 && (
              <StepReview
                currentPreview={currentPreview}
                candidatePreview={candidatePreview}
                isPending={isComparePending}
                result={result}
                delta={delta}
                monthlyImpactSummary={monthlyImpactSummary}
                yearlyImpactSummary={yearlyImpactSummary}
                isSavings={isSavings}
                isIncrease={isIncrease}
                canAnalyze={canAnalyze}
                isAnalyzePending={isAnalyzePending}
                aiResult={aiResult}
                aiQuota={aiQuota}
                isAiQuotaReached={isAiQuotaReached}
                onAnalyze={handleAnalyze}
              />
            )}
          </Suspense>

          {errorMessage && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {showBottomActions && (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
              <div className="flex items-center gap-2">
                {step < 4 ? (
                  <Button type="button" onClick={handleContinue}>
                    {m.common_actions_continue()}
                  </Button>
                ) : (
                  <>
                    {hasResult && shownPayload && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isComparePending}
                        onClick={handleClearResult}
                      >
                        {m.comparator_result_clear()}
                      </Button>
                    )}
                    <Button
                      type="button"
                      disabled={isComparePending || isQuotaReached}
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
