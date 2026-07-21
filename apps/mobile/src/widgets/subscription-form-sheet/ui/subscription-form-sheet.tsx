import { SubscriptionPeriod } from "@subeye/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import {
  subscriptionDetailQuery,
  useCreateSubscription,
  useUpdateSubscription,
} from "@/entities/subscription";
import { preferencesQuery } from "@/entities/user";
import { m } from "@/shared/i18n";
import { Field, TextField } from "@/shared/ui/field";
import { NativeDateField } from "@/shared/ui/native-date-field";
import { Segmented } from "@/shared/ui/segmented";
import { colors } from "@/shared/ui/theme";
import {
  type FormErrorCode,
  type FormErrors,
  makeInitialFormValues,
  type SubscriptionFormValues,
  validateSubscriptionForm,
} from "../model/form-schema";

// Message-function references, invoked at render time — never called at module
// scope, or the string freezes in whichever locale was active at import.
const PERIODS = [
  SubscriptionPeriod.DAY,
  SubscriptionPeriod.WEEK,
  SubscriptionPeriod.MONTH,
  SubscriptionPeriod.YEAR,
] as const;

const PERIOD_LABEL: Record<SubscriptionPeriod, () => string> = {
  [SubscriptionPeriod.DAY]: m.period_day,
  [SubscriptionPeriod.WEEK]: m.period_week,
  [SubscriptionPeriod.MONTH]: m.period_month,
  [SubscriptionPeriod.YEAR]: m.period_year,
};

const OFFER_MODES = ["none", "trial", "intro"] as const;
const OFFER_LABEL: Record<(typeof OFFER_MODES)[number], () => string> = {
  none: m.form_offerNone,
  trial: m.form_offerTrial,
  intro: m.form_offerIntro,
};

const VALIDATION_MESSAGE: Record<FormErrorCode, () => string> = {
  required: m.validation_required,
  invalidNumber: m.validation_invalidNumber,
  positiveNumber: m.validation_positiveNumber,
  wholeNumber: m.validation_wholeNumber,
  futureDate: m.validation_futureDate,
};

const messageFor = (code: FormErrorCode | undefined) =>
  code ? VALIDATION_MESSAGE[code]() : undefined;

/** Add and Edit are one sheet: `id` present means edit, absent means create. */
export function SubscriptionFormSheet({ id }: { id?: string }) {
  const router = useRouter();
  const client = useQueryClient();

  const { data: preferences } = useQuery(preferencesQuery());
  const { data: subscription } = useQuery({
    ...subscriptionDetailQuery(client, id ?? ""),
    enabled: Boolean(id),
  });

  const create = useCreateSubscription();
  const update = useUpdateSubscription();

  const [values, setValues] = useState<SubscriptionFormValues>(() =>
    makeInitialFormValues({ preferredCurrency: "usd" }),
  );
  const [errors, setErrors] = useState<FormErrors>({});

  // Preferences and the subscription arrive asynchronously, so the form is
  // seeded when they land — but ONCE. The detail query refetches on mount, and
  // re-seeding on every change would wipe whatever the user had typed by the
  // time the response came back.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !preferences) return;
    if (id && !subscription) return;
    seeded.current = true;

    setValues(
      makeInitialFormValues({
        preferredCurrency: preferences.preferredCurrency,
        subscription: subscription && {
          name: subscription.name,
          cost: subscription.cost,
          currency: subscription.currency,
          every: subscription.every,
          period: subscription.period,
          paymentDate: subscription.paymentDate,
          categoryId: subscription.categoryId,
        },
      }),
    );
  }, [preferences, subscription, id]);

  const set = <K extends keyof SubscriptionFormValues>(
    key: K,
    value: SubscriptionFormValues[K],
  ) => setValues((previous) => ({ ...previous, [key]: value }));

  const submit = () => {
    const result = validateSubscriptionForm(values);

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});

    if (id) {
      const { intro: _intro, ...changes } = result.value;
      update.mutate({ id, changes });
    } else {
      create.mutate(result.value);
    }

    // Edit is optimistic and create seeds the cache on success, so dismissing
    // straight away is correct: there is nothing to wait for on screen.
    router.back();
  };

  return (
    <ScrollView
      style={styles.sheet}
      contentContainerStyle={styles.content}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>
        {id ? m.form_titleEdit() : m.form_titleNew()}
      </Text>

      <TextField
        label={m.form_name()}
        value={values.name}
        onChangeText={(next) => set("name", next)}
        error={messageFor(errors.name)}
      />
      <TextField
        label={m.form_price()}
        value={values.cost}
        onChangeText={(next) => set("cost", next)}
        keyboardType="decimal-pad"
        error={messageFor(errors.cost)}
      />
      <TextField
        label={m.form_currency()}
        value={values.currency}
        onChangeText={(next) => set("currency", next)}
        autoCapitalize="none"
        error={messageFor(errors.currency)}
      />
      <TextField
        label={m.form_every()}
        value={values.every}
        onChangeText={(next) => set("every", next)}
        keyboardType="number-pad"
        error={messageFor(errors.every)}
      />

      <Field label={m.form_period()}>
        <Segmented
          options={PERIODS}
          value={values.period}
          label={(option) => PERIOD_LABEL[option]()}
          onChange={(option) => set("period", option)}
        />
      </Field>

      <NativeDateField
        label={m.form_nextPayment()}
        value={values.paymentDate}
        onChange={(date) => set("paymentDate", date)}
      />

      {/* An offer is part of signing up. Changing one afterwards is what the
          manage-pricing sheet does, so edit mode leaves it out entirely. */}
      {id ? null : (
        <>
          <Field label={m.form_startingOffer()}>
            <Segmented
              options={OFFER_MODES}
              value={values.offerMode}
              label={(option) => OFFER_LABEL[option]()}
              onChange={(option) => set("offerMode", option)}
            />
          </Field>

          {values.offerMode === "none" ? null : (
            <>
              <TextField
                label={m.form_offerCost()}
                value={values.offerCost}
                onChangeText={(next) => set("offerCost", next)}
                keyboardType="decimal-pad"
                error={messageFor(errors.offerCost)}
              />
              <NativeDateField
                label={m.form_offerEndsAt()}
                value={values.offerEndsAt ?? new Date()}
                minimumDate={new Date()}
                onChange={(date) => set("offerEndsAt", date)}
                error={messageFor(errors.offerEndsAt)}
              />
            </>
          )}
        </>
      )}

      <Pressable
        style={styles.save}
        onPress={submit}
        accessibilityRole="button"
      >
        <Text style={styles.saveLabel}>{m.form_save()}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  title: {
    marginBottom: 20,
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  save: {
    marginTop: 8,
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 13,
  },
  saveLabel: { fontSize: 15, fontWeight: "700", color: colors.bg },
});
