import { useFormContext, useWatch } from "react-hook-form";
import {
  FieldSet,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Separator,
} from "@/shared/components";
import { CurrencyInput, CurrencySelect } from "@/entities/currency";
import { AddSubscriptionInput } from "../../model/schema";
import { AddSubscriptionBrandImage } from "./add-subscription-brand-image";
import type { SubscriptionDto } from "shared";
import * as m from "@/i18n/messages";
import { SubscriptionFormScheduledPriceChangeCard } from "./subscription-form-scheduled-price-change-card";
import { sanitizePriceInput } from "@/shared/lib/price-input";

type SubscriptionFormBasicInfoProps = {
  existingSubscription?: SubscriptionDto;
};

export const SubscriptionFormBasicInfo = ({
  existingSubscription,
}: SubscriptionFormBasicInfoProps) => {
  const { control, setValue } = useFormContext<AddSubscriptionInput>();
  const currency = useWatch({
    control,
    name: "currency",
  });

  return (
    <FieldSet className="gap-4">
      <AddSubscriptionBrandImage />

      <div className="bg-card space-y-3 rounded-2xl border p-4 shadow-sm">
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem className="gap-1.5">
              <FormLabel className="text-muted-foreground text-xs tracking-wide uppercase">
                {m.form_basicInfo_name_label()}
              </FormLabel>
              <FormControl>
                <Input
                  autoComplete="off"
                  placeholder={m.form_basicInfo_name_placeholder()}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        <FormField
          control={control}
          name="cost"
          render={({ field }) => (
            <FormItem className="gap-1.5">
              <FormLabel className="text-muted-foreground text-xs tracking-wide uppercase">
                {m.form_basicInfo_cost_label()}
              </FormLabel>
              <FormControl>
                <CurrencyInput
                  CurrencySelect={
                    <CurrencySelect
                      value={currency}
                      onChange={(value) =>
                        setValue("currency", value, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        })
                      }
                    />
                  }
                  sanitizeValue={sanitizePriceInput}
                  InputProps={{
                    ...field,
                    value:
                      typeof field.value === "string"
                        ? field.value
                        : String(field.value ?? ""),
                    onChange: (event) => {
                      field.onChange(sanitizePriceInput(event.target.value));
                    },
                    maxLength: 6,
                    autoComplete: "off",
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <SubscriptionFormScheduledPriceChangeCard
          subscription={existingSubscription}
        />
      </div>
    </FieldSet>
  );
};
