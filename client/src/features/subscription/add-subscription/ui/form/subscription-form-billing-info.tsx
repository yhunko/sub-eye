import {
  FieldSet,
  FieldGroup,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  ToggleGroup,
  ToggleGroupItem,
  FieldLegend,
  FieldDescription,
} from "@/shared/components";
import { useFormContext, useWatch } from "react-hook-form";
import { AddSubscriptionInput } from "../../model/schema";
import { SubscriptionDatePicker } from "../subscription-date-picker/subscription-date-picker";
import { SubscriptionPeriod } from "@shared/types";
import * as m from "@/i18n/messages";

type SubscriptionFormBillingInfoProps = {
  showRenewalMode?: boolean;
};

export const SubscriptionFormBillingInfo = ({
  showRenewalMode = false,
}: SubscriptionFormBillingInfoProps) => {
  const { control, setValue } = useFormContext<AddSubscriptionInput>();
  const period = useWatch({
    control,
    name: "period",
  });

  return (
    <FieldSet>
      <FieldLegend>{m.form_billingInfo_title()}</FieldLegend>
      <FieldDescription>{m.form_billingInfo_description()}</FieldDescription>

      <FieldGroup>
        <FormField
          control={control}
          name="paymentDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {showRenewalMode
                  ? m.form_billingInfo_renewalDate_label()
                  : m.form_billingInfo_nextPaymentDate_label()}
              </FormLabel>
              <FormControl>
                <SubscriptionDatePicker
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!showRenewalMode && (
          <FormField
            control={control}
            name="willBeCancelledAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {m.form_billingInfo_willBeCancelledAt_label()}
                </FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <SubscriptionDatePicker
                      value={field.value ?? undefined}
                      onChange={field.onChange}
                      clearable={!!field.value}
                      onClear={() => setValue("willBeCancelledAt", null)}
                    />
                  </div>
                </FormControl>
                <FieldDescription>
                  {m.form_billingInfo_willBeCancelledAt_description()}
                </FieldDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={control}
          name="every"
          render={({ field }) => (
            <>
              <div className="flex flex-col gap-2 md:col-span-1 md:flex-row md:items-end">
                <FormItem>
                  <FormLabel>
                    {m.form_billingInfo_billingCycle_label()}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder={m.form_billingInfo_billingCycle_placeholder()}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
                <ToggleGroup
                  value={period}
                  type="single"
                  variant="outline"
                  spacing={0}
                >
                  <ToggleGroupItem
                    value={SubscriptionPeriod.WEEK}
                    aria-label={m.periods_weeks_ariaLabel()}
                    onClick={() => setValue("period", SubscriptionPeriod.WEEK)}
                  >
                    {m.periods_weeks()}
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value={SubscriptionPeriod.MONTH}
                    aria-label={m.periods_months_ariaLabel()}
                    onClick={() => setValue("period", SubscriptionPeriod.MONTH)}
                  >
                    {m.periods_months()}
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value={SubscriptionPeriod.YEAR}
                    aria-label={m.periods_years_ariaLabel()}
                    onClick={() => setValue("period", SubscriptionPeriod.YEAR)}
                  >
                    {m.periods_years()}
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <span className="text-muted-foreground text-sm">
                {m.form_billingInfo_billingCycle_example()}
              </span>
            </>
          )}
        />
      </FieldGroup>
    </FieldSet>
  );
};
