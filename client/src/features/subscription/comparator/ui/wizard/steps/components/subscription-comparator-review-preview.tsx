import type { FC } from "react";
import type { ComparatorDeltaDto } from "shared";
import * as m from "@/i18n/messages";
import { getComparatorReviewVisualState } from "../../../../model/comparator-review-recommendation";
import type { PlanPreview } from "../../subscription-comparator-wizard.types";
import { SubscriptionComparatorReviewPlanCard } from "./subscription-comparator-review-plan-card";

type SubscriptionComparatorReviewPreviewProps = {
  currentPreview: PlanPreview;
  candidatePreview: PlanPreview;
  deltaMonthlyYearly: ComparatorDeltaDto | undefined;
};

export const SubscriptionComparatorReviewPreview: FC<
  SubscriptionComparatorReviewPreviewProps
> = ({ currentPreview, candidatePreview, deltaMonthlyYearly }) => {
  const visualState = getComparatorReviewVisualState(deltaMonthlyYearly);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <SubscriptionComparatorReviewPlanCard
        title={m.comparator_review_current()}
        preview={currentPreview}
        state={visualState.currentPlanState}
        statusTone={visualState.currentPlanStatusTone}
      />

      <SubscriptionComparatorReviewPlanCard
        title={m.comparator_review_candidate()}
        preview={candidatePreview}
        state={visualState.candidatePlanState}
        statusTone={visualState.candidatePlanStatusTone}
      />
    </div>
  );
};
