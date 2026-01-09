"use client";

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
import { Period } from "@/shared/lib/db";
import { useTranslations } from "next-intl";

export const SubscriptionFormBillingInfo = () => {
  const t = useTranslations("subscription.form.billingInfo");
  const tPeriods = useTranslations("common.periods");
  const { control, setValue } = useFormContext<AddSubscriptionInput>();
  const period = useWatch({
    control,
    name: "period",
  });

  return (
    <FieldSet>
      <FieldLegend>{t("title")}</FieldLegend>
      <FieldDescription>{t("description")}</FieldDescription>

      <FieldGroup>
        <FormField
          control={control}
          name="paymentDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("nextPaymentDate.label")}</FormLabel>
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
                  <FormLabel>{t("billingCycle.label")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder={t("billingCycle.placeholder")}
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
                    value={Period.WEEK}
                    aria-label="Toggle bold"
                    onClick={() => setValue("period", Period.WEEK)}
                  >
                    {tPeriods("week")}
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value={Period.MONTH}
                    aria-label="Toggle italic"
                    onClick={() => setValue("period", Period.MONTH)}
                  >
                    {tPeriods("month")}
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value={Period.YEAR}
                    aria-label="Toggle strikethrough"
                    onClick={() => setValue("period", Period.YEAR)}
                  >
                    {tPeriods("year")}
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <span className="text-muted-foreground text-sm">
                {t("billingCycle.example")}
              </span>
            </>
          )}
        />
      </FieldGroup>
    </FieldSet>
  );
};
