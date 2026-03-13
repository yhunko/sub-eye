import type { FC } from "react";
import { SubscriptionComparatorManualPlanForm } from "../subscription-comparator-manual-plan-form";
import * as m from "@/i18n/messages";
import type {
  ManualDraftChangeHandler,
  ManualPlanDraft,
} from "../../../model/comparator-form";

type SubscriptionComparatorStepCandidateProps = {
  candidateManual: ManualPlanDraft;
  onCandidateManualChange: ManualDraftChangeHandler;
};

const SubscriptionComparatorStepCandidate: FC<
  SubscriptionComparatorStepCandidateProps
> = ({ candidateManual, onCandidateManualChange }) => {
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
