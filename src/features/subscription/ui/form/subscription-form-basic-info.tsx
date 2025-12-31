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

export const SubscriptionFormBasicInfo = () => {
  const { control, setValue } = useFormContext<AddSubscriptionInput>();
  const currency = useWatch({
    control,
    name: "currency",
  });

  return (
    <FieldSet>
      <FieldLegend>Basic Information</FieldLegend>
      <FieldDescription>Enter the subscription name and cost</FieldDescription>

      <AddSubscriptionBrandImage />

      <FieldGroup>
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Subscription name..." {...field} />
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
              <FormLabel>Cost</FormLabel>
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
