import type { FC } from "react";
import * as m from "@/i18n/messages";
import {
  Alert,
  AlertDescription,
  CardDescription,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components";
import type {
  ManualDraftChangeHandler,
  ManualPlanDraft,
} from "../../../model/comparator-form";
import { SubscriptionComparatorManualPlanForm } from "../subscription-comparator-manual-plan-form";
import type {
  CompareMode,
  SelectableSubscriptionOption,
} from "../subscription-comparator-wizard.types";

type SubscriptionComparatorStepCandidateProps = {
  mode: CompareMode;
  candidateManual: ManualPlanDraft;
  onCandidateManualChange: ManualDraftChangeHandler;
  candidateExistingId: string;
  selectableSubscriptions: SelectableSubscriptionOption[];
  onCandidateExistingChange: (id: string) => void;
};

const SubscriptionComparatorStepCandidate: FC<
  SubscriptionComparatorStepCandidateProps
> = ({
  mode,
  candidateManual,
  onCandidateManualChange,
  candidateExistingId,
  selectableSubscriptions,
  onCandidateExistingChange,
}) => {
  if (mode === "existingVsExisting") {
    return (
      <section className="space-y-4">
        <header className="border-border/50 space-y-2 border-b pb-3">
          <CardTitle className="text-base">
            {m.comparator_pick_candidate_subscription_title()}
          </CardTitle>
          <CardDescription>
            {m.comparator_pick_candidate_subscription_description()}
          </CardDescription>
        </header>
        <div className="space-y-3">
          {selectableSubscriptions.length === 0 ? (
            <Alert>
              <AlertDescription>
                {m.comparator_pick_subscription_empty()}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              <Label>{m.comparator_pick_candidate_subscription_label()}</Label>
              <Select
                value={candidateExistingId || undefined}
                onValueChange={onCandidateExistingChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={m.comparator_pick_candidate_subscription_placeholder()}
                  />
                </SelectTrigger>
                <SelectContent>
                  {selectableSubscriptions.map((subscription) => (
                    <SelectItem key={subscription.id} value={subscription.id}>
                      {subscription.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <SubscriptionComparatorManualPlanForm
      title={m.comparator_candidate_title()}
      description={m.comparator_candidate_description()}
      draft={candidateManual}
      onChange={onCandidateManualChange}
    />
  );
};

export default SubscriptionComparatorStepCandidate;
