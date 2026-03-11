import type { FC } from "react";
import { SubscriptionComparatorManualPlanForm } from "../subscription-comparator-manual-plan-form";
import * as m from "@/i18n/messages";
import { useSubscriptionComparatorWizard } from "../use-subscription-comparator-wizard";

const SubscriptionComparatorStepCandidate: FC = () => {
  const { candidateManual, onCandidateManualChange } =
    useSubscriptionComparatorWizard();

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
