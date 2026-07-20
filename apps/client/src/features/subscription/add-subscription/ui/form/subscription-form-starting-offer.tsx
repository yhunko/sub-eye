import { addDays, addMonths, isSameDay, startOfDay } from "date-fns";
import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { CurrencyInput, CurrencySelect } from "@/entities/currency";
import * as m from "@/i18n/messages";
import {
  FieldDescription,
  FieldSet,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  ToggleGroup,
  ToggleGroupItem,
} from "@/shared/components";
import { cn } from "@/shared/lib/classes-utils";
import { sanitizePriceInput } from "@/shared/lib/price-input";
import type { AddSubscriptionInput } from "../../model/schema";
import { SubscriptionDatePicker } from "../subscription-date-picker/subscription-date-picker";

type DurationPreset = { key: string; label: string; date: Date };

export const SubscriptionFormStartingOffer = () => {
  const { control } = useFormContext<AddSubscriptionInput>();
  const introMode = useWatch({ control, name: "introMode" });
  const currency = useWatch({ control, name: "currency" });
  const today = useMemo(() => startOfDay(new Date()), []);
  const minEndDate = useMemo(() => addDays(today, 1), [today]);

  // Common durations so users can pick "3 months" instead of a calendar date.
  // Trials skew shorter; discounts skew longer.
  const presets = useMemo<DurationPreset[]>(() => {
    if (introMode === "trial") {
      return [
        {
          key: "7d",
          label: m.subscription_form_offer_preset_7d(),
          date: addDays(today, 7),
        },
        {
          key: "14d",
          label: m.subscription_form_offer_preset_14d(),
          date: addDays(today, 14),
        },
        {
          key: "1m",
          label: m.subscription_form_offer_preset_1m(),
          date: addMonths(today, 1),
        },
        {
          key: "3m",
          label: m.subscription_form_offer_preset_3m(),
          date: addMonths(today, 3),
        },
      ];
    }
    return [
      {
        key: "1m",
        label: m.subscription_form_offer_preset_1m(),
        date: addMonths(today, 1),
      },
      {
        key: "3m",
        label: m.subscription_form_offer_preset_3m(),
        date: addMonths(today, 3),
      },
      {
        key: "6m",
        label: m.subscription_form_offer_preset_6m(),
        date: addMonths(today, 6),
      },
      {
        key: "1y",
        label: m.subscription_form_offer_preset_1y(),
        date: addMonths(today, 12),
      },
    ];
  }, [introMode, today]);

  return (
    <FieldSet className="bg-card gap-3 rounded-2xl border p-4 shadow-sm">
      <FormLabel className="text-muted-foreground text-xs tracking-wide uppercase">
        {m.subscription_form_offer_label()}
      </FormLabel>

      <FormField
        control={control}
        name="introMode"
        render={({ field }) => (
          <FormItem className="gap-2">
            <FormControl>
              <ToggleGroup
                type="single"
                value={field.value ?? "none"}
                onValueChange={(value) => {
                  if (value) field.onChange(value);
                }}
                variant="outline"
                className="w-full"
              >
                <ToggleGroupItem
                  value="none"
                  className="min-w-0 flex-1 text-xs sm:text-sm"
                >
                  {m.subscription_form_offer_mode_standard()}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="trial"
                  className="min-w-0 flex-1 text-xs sm:text-sm"
                >
                  {m.subscription_form_offer_mode_trial()}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="intro"
                  className="min-w-0 flex-1 text-xs sm:text-sm"
                >
                  {m.subscription_form_offer_mode_intro()}
                </ToggleGroupItem>
              </ToggleGroup>
            </FormControl>
          </FormItem>
        )}
      />

      {introMode === "intro" && (
        <FormField
          control={control}
          name="introCost"
          render={({ field }) => (
            <FormItem className="gap-1.5">
              <FormLabel className="text-muted-foreground text-xs tracking-wide uppercase">
                {m.subscription_introDiscount_introPrice_label()}
              </FormLabel>
              <FormControl>
                <CurrencyInput
                  CurrencySelect={
                    <CurrencySelect
                      value={currency}
                      disabled
                      onChange={() => {}}
                    />
                  }
                  sanitizeValue={sanitizePriceInput}
                  InputProps={{
                    value: typeof field.value === "string" ? field.value : "",
                    onChange: (event) =>
                      field.onChange(sanitizePriceInput(event.target.value)),
                    placeholder: "0.00",
                    maxLength: 6,
                    autoComplete: "off",
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {introMode && introMode !== "none" && (
        <FormField
          control={control}
          name="introEndsAt"
          render={({ field }) => (
            <FormItem className="gap-1.5">
              <FormLabel className="text-muted-foreground text-xs tracking-wide uppercase">
                {introMode === "trial"
                  ? m.subscription_trial_endDate_label()
                  : m.subscription_introDiscount_endDate_label()}
              </FormLabel>
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => {
                  const active =
                    field.value instanceof Date &&
                    isSameDay(field.value, preset.date);
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => field.onChange(preset.date)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        active
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              <FormControl>
                <SubscriptionDatePicker
                  value={field.value ?? undefined}
                  minDate={minEndDate}
                  onChange={field.onChange}
                />
              </FormControl>
              <FieldDescription className="text-xs">
                {introMode === "trial"
                  ? m.subscription_form_offer_trial_hint()
                  : m.subscription_form_offer_intro_hint()}
              </FieldDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </FieldSet>
  );
};
