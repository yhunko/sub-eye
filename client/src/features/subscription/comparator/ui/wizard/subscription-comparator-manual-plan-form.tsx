import type { FC } from "react";
import { CurrencyInput, CurrencySelect } from "@/entities/currency";
import { SubscriptionCycleInput } from "@/features/subscription/shared/ui/subscription-cycle-input";
import * as m from "@/i18n/messages";
import { sanitizePriceInput } from "@/shared/lib/price-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@/shared/components";
import type { ManualPlanDraft } from "../../model/comparator-form";

type ManualDraftChangeHandler = (
  next:
    | Partial<ManualPlanDraft>
    | ((previous: ManualPlanDraft) => Partial<ManualPlanDraft>),
) => void;

type SubscriptionComparatorManualPlanFormProps = {
  title: string;
  description: string;
  draft: ManualPlanDraft;
  onChange: ManualDraftChangeHandler;
};

export const SubscriptionComparatorManualPlanForm: FC<
  SubscriptionComparatorManualPlanFormProps
> = ({ title, description, draft, onChange }) => {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${title}-name`} className="text-xs uppercase">
            {m.form_basicInfo_name_label()}
          </Label>
          <Input
            id={`${title}-name`}
            value={draft.name}
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder={m.form_basicInfo_name_placeholder()}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs uppercase">
            {m.form_basicInfo_cost_label()}
          </Label>
          <CurrencyInput
            CurrencySelect={
              <CurrencySelect
                value={draft.currency}
                onChange={(value) => onChange({ currency: value })}
              />
            }
            sanitizeValue={sanitizePriceInput}
            InputProps={{
              value: draft.amountInput,
              onChange: (event) => {
                onChange({
                  amountInput: sanitizePriceInput(event.target.value),
                });
              },
              placeholder: "0.00",
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs uppercase">
            {m.form_billingInfo_billingCycle_label()}
          </Label>
          <SubscriptionCycleInput
            everyValue={draft.everyInput}
            onEveryValueChange={(value) =>
              onChange({
                everyInput: value.replace(/[^\d]/g, "").slice(0, 3),
              })
            }
            onEveryBlur={() => {
              if (!draft.everyInput.trim()) {
                onChange({ everyInput: "1" });
              }
            }}
            period={draft.period}
            onPeriodChange={(period) => onChange({ period })}
            everyInputProps={{
              type: "text",
              inputMode: "numeric",
              className: "md:max-w-24",
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
};
