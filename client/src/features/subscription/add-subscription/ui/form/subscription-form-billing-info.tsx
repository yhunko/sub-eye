import {
  FieldSet,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  ToggleGroup,
  ToggleGroupItem,
  FieldDescription,
  AnimatedBackground,
} from "@/shared/components";
import { useFormContext, useWatch } from "react-hook-form";
import { AddSubscriptionInput } from "../../model/schema";
import { SubscriptionDatePicker } from "../subscription-date-picker/subscription-date-picker";
import { SubscriptionPeriod } from "shared";
import * as m from "@/i18n/messages";

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
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <FormControl>
                <Input
                  type="number"
                  autoComplete="off"
                  className="md:max-w-28"
                  placeholder={m.form_billingInfo_billingCycle_placeholder()}
                  {...field}
                />
              </FormControl>

              <ToggleGroup
                value={period}
                type="single"
                variant="outline"
                spacing={0}
                className="w-full md:w-auto"
                onValueChange={(val) => {
                  if (val) {
                    setValue("period", val as SubscriptionPeriod);
                  }
                }}
              >
                <AnimatedBackground
                  defaultValue={period}
                  className="bg-accent rounded-md"
                  transition={{
                    type: "spring",
                    bounce: 0.2,
                    duration: 0.6,
                  }}
                >
                  <ToggleGroupItem
                    value={SubscriptionPeriod.WEEK}
                    data-id={SubscriptionPeriod.WEEK}
                    aria-label={m.periods_weeks_ariaLabel()}
                    className="flex-1 hover:bg-transparent data-[state=on]:bg-transparent md:flex-none"
                  >
                    {m.periods_weeks()}
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value={SubscriptionPeriod.MONTH}
                    data-id={SubscriptionPeriod.MONTH}
                    aria-label={m.periods_months_ariaLabel()}
                    className="flex-1 hover:bg-transparent data-[state=on]:bg-transparent md:flex-none"
                  >
                    {m.periods_months()}
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value={SubscriptionPeriod.YEAR}
                    data-id={SubscriptionPeriod.YEAR}
                    aria-label={m.periods_years_ariaLabel()}
                    className="flex-1 hover:bg-transparent data-[state=on]:bg-transparent md:flex-none"
                  >
                    {m.periods_years()}
                  </ToggleGroupItem>
                </AnimatedBackground>
              </ToggleGroup>
            </div>

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
