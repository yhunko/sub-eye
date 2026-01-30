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
import { CurrencyInput, CurrencySelect } from "@/entities/currency";
import { AddSubscriptionInput } from "../../model/schema";
import { AddSubscriptionBrandImage } from "./add-subscription-brand-image";
import { useTranslation } from "react-i18next";

export const SubscriptionFormBasicInfo = () => {
  const { t } = useTranslation("subscription");
  const { control, setValue } = useFormContext<AddSubscriptionInput>();
  const currency = useWatch({
    control,
    name: "currency",
  });

  return (
    <FieldSet>
      <FieldLegend>{t("form.basicInfo.title")}</FieldLegend>
      <FieldDescription>{t("form.basicInfo.description")}</FieldDescription>

      <AddSubscriptionBrandImage />

      <FieldGroup>
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("form.basicInfo.name.label")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("form.basicInfo.name.placeholder")}
                  {...field}
                />
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
              <FormLabel>{t("form.basicInfo.cost.label")}</FormLabel>
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
