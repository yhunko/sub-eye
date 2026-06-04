import type { SubscriptionDto } from "@subeye/shared";
import { useFormContext, useWatch } from "react-hook-form";
import { CurrencyInput, CurrencySelect } from "@/entities/currency";
import { CategorySelector } from "@/features/category/category-selector/category-selector";
import * as m from "@/i18n/messages";
import {
  FieldSet,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Separator,
} from "@/shared/components";
import { sanitizePriceInput } from "@/shared/lib/price-input";
import type { AddSubscriptionInput } from "../../model/schema";
import { AddSubscriptionBrandImage } from "./add-subscription-brand-image";
import { SubscriptionFormScheduledPriceChangeCard } from "./subscription-form-scheduled-price-change-card";

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

        <Separator />

        <FormField
          control={control}
          name="categoryId"
          render={({ field }) => (
            <FormItem className="gap-1.5">
              <FormLabel className="text-muted-foreground text-xs tracking-wide uppercase">
                {m.form_basicInfo_category_label()}
              </FormLabel>
              <FormControl>
                <CategorySelector
                  value={field.value ?? null}
                  onChange={(val) => field.onChange(val)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </FieldSet>
  );
};
