import { useFormContext, useWatch } from "react-hook-form";
import { SubscriptionCycleInput } from "@/features/subscription/shared/ui/subscription-cycle-input";
import * as m from "@/i18n/messages";
import {
  FieldDescription,
  FieldSet,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components";
import type { AddSubscriptionInput } from "../../model/schema";
import { SubscriptionDatePicker } from "../subscription-date-picker/subscription-date-picker";

export const SubscriptionFormBillingInfo = () => {
  const { control, setValue } = useFormContext<AddSubscriptionInput>();
  const period = useWatch({
    control,
    name: "period",
  });

  return (
    <FieldSet className="bg-card gap-3 rounded-2xl border p-4 shadow-sm">
      <FormField
        control={control}
        name="paymentDate"
        render={({ field }) => (
          <FormItem className="gap-1.5">
            <FormLabel className="text-muted-foreground text-xs tracking-wide uppercase">
              {m.form_billingInfo_nextPaymentDate_label()}
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

      <FormField
        control={control}
        name="every"
        render={({ field }) => (
          <FormItem className="gap-2">
            <FormLabel className="text-muted-foreground text-xs tracking-wide uppercase">
              {m.form_billingInfo_billingCycle_label()}
            </FormLabel>
            <FormControl>
              <SubscriptionCycleInput
                everyValue={field.value}
                onEveryValueChange={field.onChange}
                period={period}
                onPeriodChange={(value) => {
                  setValue("period", value, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  });
                }}
                everyInputProps={{
                  placeholder: m.form_billingInfo_billingCycle_placeholder(),
                }}
              />
            </FormControl>

            <FieldDescription className="text-xs">
              {m.form_billingInfo_billingCycle_example()}
            </FieldDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </FieldSet>
  );
};
