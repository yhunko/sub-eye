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
import { AddSubscriptionInput } from "../model/schema";
import { SubscriptionDateSelect } from "./subscription-date-select";
import { Period } from "@/shared/lib/db";

export const SubscriptionFormBillingInfo = () => {
  const { control, setValue } = useFormContext<AddSubscriptionInput>();
  const period = useWatch({
    control,
    name: "period",
  });

  return (
    <FieldSet>
      <FieldLegend>Billing Details</FieldLegend>
      <FieldDescription>
        Configure when and how often you&#39;re billed
      </FieldDescription>

      <FieldGroup>
        <FormField
          control={control}
          name="paymentDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Next Payment Date</FormLabel>
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
            <div className="relative">
              <div className="flex flex-col gap-2 md:col-span-1 md:flex-row md:items-end">
                <FormItem>
                  <FormLabel>Billing cycle</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Every..." {...field} />
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
                    Week
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value={Period.MONTH}
                    aria-label="Toggle italic"
                    onClick={() => setValue("period", Period.MONTH)}
                  >
                    Month
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value={Period.YEAR}
                    aria-label="Toggle strikethrough"
                    onClick={() => setValue("period", Period.YEAR)}
                  >
                    Year
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <span className="text-muted-foreground absolute -bottom-1 translate-y-full text-sm">
                For example: &#34;Every 1 month&#34; means you&#39;re billed
                monthly
              </span>
            </div>
          )}
        />
      </FieldGroup>
    </FieldSet>
  );
};
