import type {
  AnalyzeComparatorResponseDto,
  ComparatorDeltaDto,
  ComparatorResultDto,
  MonthlyUsage,
} from "shared";
import type { ManualPlanDraft } from "../../model/comparator-form";
import type {
  CompareMode,
  PlanPreview,
  SelectableSubscriptionOption,
} from "./subscription-comparator-wizard.types";

export type ManualDraftChangeHandler = (
  next:
    | Partial<ManualPlanDraft>
    | ((previous: ManualPlanDraft) => Partial<ManualPlanDraft>),
) => void;

export type SubscriptionComparatorWizardContextValue = {
  mode: CompareMode;
  prefillSubscriptionId?: string;
  currentExistingId: string;
  selectableSubscriptions: SelectableSubscriptionOption[];
  onCurrentExistingChange: (id: string) => void;
  onClearPrefill: () => void;
  currentManual: ManualPlanDraft;
  onCurrentManualChange: ManualDraftChangeHandler;
  candidateManual: ManualPlanDraft;
  onCandidateManualChange: ManualDraftChangeHandler;
  onModeChange: (mode: CompareMode) => void;
  currentPreview: PlanPreview;
  candidatePreview: PlanPreview;
  cadenceInsight: string | null;
  isPending: boolean;
  result: ComparatorResultDto | undefined;
  delta: ComparatorDeltaDto | undefined;
  monthlyImpactSummary: string;
  yearlyImpactSummary: string;
  isSavings: boolean;
  isIncrease: boolean;
  canAnalyze: boolean;
  isAnalyzePending: boolean;
  aiResult: AnalyzeComparatorResponseDto | undefined;
  aiQuota: MonthlyUsage | undefined;
  isAiQuotaReached: boolean;
  onAnalyze: () => void;
};
