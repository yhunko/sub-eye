"use client";

import { useFormContext, useWatch } from "react-hook-form";
import {
  FieldGroup,
  FieldSet,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  FieldLegend,
  FieldDescription,
} from "@/shared/components";
import { CurrencyInput, CurrencySelect } from "../../../currency";
import { AddSubscriptionInput } from "../../model/schema";
import { AddSubscriptionBrandImage } from "./add-subscription-brand-image";
import { useTranslations } from "next-intl";

export const SubscriptionFormBasicInfo = () => {
  const t = useTranslations("subscription.form.basicInfo");
  const { control, setValue } = useFormContext<AddSubscriptionInput>();
  const currency = useWatch({
    control,
    name: "currency",
  });

  return (
    <FieldSet>
      <FieldLegend>{t("title")}</FieldLegend>
      <FieldDescription>{t("description")}</FieldDescription>

      <AddSubscriptionBrandImage />

      <FieldGroup>
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("name.label")}</FormLabel>
              <FormControl>
                <Input placeholder={t("name.placeholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="cost"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("cost.label")}</FormLabel>
              <FormControl>
                <CurrencyInput
                  CurrencySelect={
                    <CurrencySelect
                      value={currency}
                      onChange={(value) => setValue("currency", value)}
                    />
                  }
                  InputProps={field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FieldGroup>
    </FieldSet>
  );
};
