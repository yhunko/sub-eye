import type { FC } from "react";
import { SubscriptionComparatorManualPlanForm } from "../subscription-comparator-manual-plan-form";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components";
import * as m from "@/i18n/messages";
import { useSubscriptionComparatorWizard } from "../use-subscription-comparator-wizard";

const SubscriptionComparatorStepCurrent: FC = () => {
  const {
    mode,
    prefillSubscriptionId,
    currentExistingId,
    selectableSubscriptions,
    onCurrentExistingChange,
    onClearPrefill,
    currentManual,
    onCurrentManualChange,
  } = useSubscriptionComparatorWizard();

  if (mode === "manualVsManual") {
    return (
      <SubscriptionComparatorManualPlanForm
        title={m.comparator_current_manual_title()}
        description={m.comparator_current_manual_description()}
        draft={currentManual}
        onChange={onCurrentManualChange}
      />
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {m.comparator_pick_subscription_title()}
        </CardTitle>
        <CardDescription>
          {m.comparator_pick_subscription_description()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {selectableSubscriptions.length === 0 ? (
          <Alert>
            <AlertDescription>
              {m.comparator_pick_subscription_empty()}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            <Label>{m.comparator_pick_subscription_label()}</Label>
            {prefillSubscriptionId &&
              currentExistingId === prefillSubscriptionId && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2 text-xs">
                  <span className="text-muted-foreground">
                    {m.comparator_review_prefill_hint()}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={onClearPrefill}
                  >
                    {m.comparator_review_prefill_clear()}
                  </Button>
                </div>
              )}

            <Select
              value={currentExistingId || undefined}
              onValueChange={onCurrentExistingChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={m.comparator_pick_subscription_placeholder()}
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
      </CardContent>
    </Card>
  );
};

export default SubscriptionComparatorStepCurrent;
