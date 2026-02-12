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
  Switch,
} from "@/shared/components";
import { CurrencyInput, CurrencySelect } from "@/entities/currency";
import { AddSubscriptionInput } from "../../model/schema";
import { AddSubscriptionBrandImage } from "./add-subscription-brand-image";
import * as m from "@/i18n/messages";

export const SubscriptionFormBasicInfo = () => {
  const { control, setValue } = useFormContext<AddSubscriptionInput>();
  const currency = useWatch({
    control,
    name: "currency",
  });

  return (
    <FieldSet>
      <FieldLegend>{m.form_basicInfo_title()}</FieldLegend>
      <FieldDescription>{m.form_basicInfo_description()}</FieldDescription>

      <AddSubscriptionBrandImage />

      <FieldGroup>
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{m.form_basicInfo_name_label()}</FormLabel>
              <FormControl>
                <Input
                  placeholder={m.form_basicInfo_name_placeholder()}
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
              <FormLabel>{m.form_basicInfo_cost_label()}</FormLabel>
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

        <FormField
          control={control}
          name="isCancelled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>{m.form_basicInfo_isCancelled_label()}</FormLabel>
                <FieldDescription>
                  {m.form_basicInfo_isCancelled_description()}
                </FieldDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </FieldGroup>
    </FieldSet>
  );
};
