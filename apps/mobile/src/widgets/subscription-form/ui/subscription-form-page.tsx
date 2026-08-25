import { SubscriptionPeriod } from "@subeye/model";
import { useQuery } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { categoriesQuery } from "@/entities/category";
import { usePro } from "@/entities/pro";
import { m } from "@/shared/i18n";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { CurrencyPicker } from "@/shared/ui/currency-picker";
import { Field, TextField } from "@/shared/ui/field";
import { NativeDateField } from "@/shared/ui/native-date-field";
import { Segmented } from "@/shared/ui/segmented";
import { colors } from "@/shared/ui/theme";
import { useSubscriptionForm } from "../model/form-context";
import type { FormErrorCode } from "../model/form-schema";

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

/**
 * The subscription's logo, and the way to change it.
 *
 * It replaces a "Website" text field that asked the user to know and type
 * `netflix.com`. An avatar above the fields says what the value is FOR — the
 * row's logo — in a way a labelled domain input never did.
 */
function BrandAvatar() {
  const router = useRouter();
  const { values } = useSubscriptionForm();
  const domain = values.brandDomain.trim();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${m.form_brand()}, ${domain || m.form_brandNone()}`}
      onPress={() => router.push("/subscription-form/brand")}
      style={({ pressed }) => [styles.brand, pressed && styles.brandPressed]}
    >
      {domain ? (
        <BrandLogo name={values.name} brandDomain={domain} size={88} />
      ) : (
        <View style={styles.brandEmpty}>
          <SymbolView
            name={{ ios: "magnifyingglass", android: "search" }}
            size={30}
            tintColor={colors.muted}
          />
        </View>
      )}
      <Text style={styles.brandCaption} numberOfLines={1}>
        {domain || m.form_brandPick()}
      </Text>
    </Pressable>
  );
}

/** The category row is a destination, not a control: it pushes the picker. */
function CategoryRow() {
  const router = useRouter();
  const isPro = usePro();
  const { values } = useSubscriptionForm();
  const categories = useQuery(categoriesQuery());

  const label = m.form_category();
  const selected = categories.data?.find((row) => row.id === values.categoryId);
  // The fourth category surface, and the one that gets missed. Locked, the row
  // wears the badge rather than a value it can never have.
  const value = !isPro
    ? m.paywall_badge()
    : selected
      ? `${selected.emoji} ${selected.name}`
      : m.form_categoryNone();

  return (
    <Field label={label}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value}`}
        onPress={() =>
          router.push(isPro ? "/subscription-form/category" : "/paywall")
        }
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <Text style={styles.triggerValue}>{value}</Text>
        {/* A chevron.right, not the up/down of a menu control — this row goes
            somewhere, and the glyph is the promise that it does. */}
        <SymbolView
          name={{ ios: "chevron.right", android: "chevron_right" }}
          size={13}
          tintColor={colors.muted}
          weight="semibold"
        />
      </Pressable>
    </Field>
  );
}

/**
 * Add and Edit are one screen: `id` present on the provider means edit.
 *
 * A full-screen modal with its own stack rather than a formSheet. The sheet was
 * pinned at a 0.9 detent, so it had a modal's footprint without a modal's
 * navigation — which is why the category picker had to be an ActionSheet. Cancel
 * and Save live in the nav bar, the iOS convention for a modal form.
 */
export function SubscriptionFormPage() {
  const router = useRouter();
  const isPro = usePro();
  const { id, values, errors, set, submit } = useSubscriptionForm();

  return (
    <>
      <Stack.Screen
        options={{
          title: id ? m.form_titleEdit() : m.form_titleNew(),
          // Glyphs, not words: iOS 26 gives each bar item its own glass capsule
          // and a symbol sits in one the way a word does not. The labels stay on
          // accessibilityLabel — an unlabelled glyph is silent to VoiceOver.
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={m.common_cancel()}
            >
              <SymbolView
                name={{ ios: "xmark", android: "close" }}
                size={17}
                tintColor={colors.text}
                weight="semibold"
              />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={submit}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={m.form_save()}
            >
              <SymbolView
                name={{ ios: "checkmark", android: "check" }}
                size={17}
                tintColor={colors.accent}
                weight="semibold"
              />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={styles.page}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <BrandAvatar />

        <TextField
          label={m.form_name()}
          value={values.name}
          onChangeText={(next) => set("name", next)}
          error={messageFor(errors.name)}
        />
        {/* One control, the way a native amount field carries its unit: the
            currency is a trailing accessory inside the price box rather than a
            second labelled row. */}
        <Field label={m.form_price()} error={messageFor(errors.cost)}>
          <View style={[styles.box, errors.cost ? styles.boxError : null]}>
            <TextInput
              style={styles.amount}
              value={values.cost}
              onChangeText={(next) => set("cost", next)}
              keyboardType="decimal-pad"
              placeholderTextColor={colors.muted}
              keyboardAppearance="dark"
            />
            <CurrencyPicker
              value={values.currency}
              onChange={(next) => set("currency", next)}
            />
          </View>
        </Field>

        {/* What makes Home's category breakdown say anything: without a value
            here every subscription lands in "Uncategorized". */}
        <CategoryRow />

        {/* "Every 2 months" is one sentence, so it is one row. The count is
            sized for the two digits a real billing cycle uses — a wider box
            only invites a number nobody bills on. */}
        <Field label={m.form_every()} error={messageFor(errors.every)}>
          <View style={styles.everyRow}>
            <TextInput
              style={[
                styles.box,
                styles.count,
                errors.every ? styles.boxError : null,
              ]}
              value={values.every}
              onChangeText={(next) => set("every", next)}
              keyboardType="number-pad"
              keyboardAppearance="dark"
            />
            {/* No "Period" label of its own — the segments announce themselves
                and the row already reads "Every 2 · months". */}
            <View style={styles.periods}>
              <Segmented
                options={PERIODS}
                value={values.period}
                label={(option) => PERIOD_LABEL[option]()}
                onChange={(option) => set("period", option)}
              />
            </View>
          </View>
        </Field>

        {/* The ANCHOR, not the next charge — every future occurrence is
            projected from it, so it is usually in the past. Labelled "next
            payment" it read as a bug on every subscription older than a cycle. */}
        <NativeDateField
          label={m.form_firstPayment()}
          value={values.paymentDate}
          onChange={(date) => set("paymentDate", date)}
        />

        {/* An offer is part of signing up. Changing one afterwards is what the
            manage-pricing sheet does, so edit mode leaves it out entirely.

            A trial or an intro price IS a pricing phase — the same Pro feature
            that sheet gates. Left open, a free user could create a phase they
            could then never see or change. Locked, it wears the badge exactly
            like the category row above. */}
        {id ? null : !isPro ? (
          <Field label={m.form_startingOffer()}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${m.form_startingOffer()}, ${m.paywall_badge()}`}
              onPress={() => router.push("/paywall")}
              style={({ pressed }) => [
                styles.trigger,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.triggerValue}>{m.paywall_badge()}</Text>
              <SymbolView
                name={{ ios: "chevron.right", android: "chevron_right" }}
                size={13}
                tintColor={colors.muted}
                weight="semibold"
              />
            </Pressable>
          </Field>
        ) : (
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
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  cancel: { fontSize: 16, color: colors.text },
  save: { fontSize: 16, fontWeight: "700", color: colors.accent },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pressed: { backgroundColor: colors.surfaceAlt },
  triggerValue: { flex: 1, fontSize: 16, color: colors.text },
  brand: { alignItems: "center", gap: 8, marginBottom: 20 },
  brandPressed: { opacity: 0.6 },
  brandEmpty: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  brandCaption: { fontSize: 13, color: colors.muted },
  // The same box `Field`'s own input draws, but as a container: the controls
  // inside it are borderless so the row reads as one field.
  box: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: "hidden",
  },
  boxError: { borderColor: colors.danger },
  amount: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  everyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  count: {
    width: 64,
    fontSize: 16,
    color: colors.text,
    textAlign: "center",
    paddingVertical: 12,
  },
  periods: { flex: 1 },
});
