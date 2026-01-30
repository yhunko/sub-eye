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
import { SubscriptionDateSelect } from "../subscription-date-select";
import { useTranslation } from "react-i18next";
import { SubscriptionPeriod } from "@shared/types";

export const SubscriptionFormBillingInfo = () => {
  const { t } = useTranslation("subscription");
  const { t: tPeriods } = useTranslation("common", {
    keyPrefix: "periods",
  });
  const { control, setValue } = useFormContext<AddSubscriptionInput>();
  const period = useWatch({
    control,
    name: "period",
  });

  return (
    <FieldSet>
      <FieldLegend>{t("form.billingInfo.title")}</FieldLegend>
      <FieldDescription>{t("form.billingInfo.description")}</FieldDescription>

      <FieldGroup>
        <FormField
          control={control}
          name="paymentDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("form.billingInfo.nextPaymentDate.label")}
              </FormLabel>
              <FormControl>
                <SubscriptionDateSelect
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
            <>
              <div className="flex flex-col gap-2 md:col-span-1 md:flex-row md:items-end">
                <FormItem>
                  <FormLabel>
                    {t("form.billingInfo.billingCycle.label")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder={t(
                        "form.billingInfo.billingCycle.placeholder",
                      )}
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
                    aria-label="Toggle week"
                    onClick={() => setValue("period", SubscriptionPeriod.WEEK)}
                  >
                    {tPeriods("weeks")}
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value={SubscriptionPeriod.MONTH}
                    aria-label="Toggle month"
                    onClick={() => setValue("period", SubscriptionPeriod.MONTH)}
                  >
                    {tPeriods("months")}
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value={SubscriptionPeriod.YEAR}
                    aria-label="Toggle year"
                    onClick={() => setValue("period", SubscriptionPeriod.YEAR)}
                  >
                    {tPeriods("years")}
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <span className="text-muted-foreground text-sm">
                {t("form.billingInfo.billingCycle.example")}
              </span>
            </>
          )}
        />
      </FieldGroup>
    </FieldSet>
  );
};
