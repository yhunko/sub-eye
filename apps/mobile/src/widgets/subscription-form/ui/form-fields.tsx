import { SubscriptionPeriod } from "@subeye/model";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { categoriesQuery } from "@/entities/category";
import { usePro } from "@/entities/pro";
import { m } from "@/shared/i18n";
import {
  formatCadence,
  formatMoney,
  formatShortDate,
  parsePrice,
  toIsoDay,
  tomorrow,
} from "@/shared/lib/format";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { ChoiceRow } from "@/shared/ui/choice-row";
import { CurrencyPicker } from "@/shared/ui/currency-picker";
import { Field, TextField, ValueField } from "@/shared/ui/field";
import { NativeDateField } from "@/shared/ui/native-date-field";
import { Pills } from "@/shared/ui/pills";
import { colors } from "@/shared/ui/theme";
import { useLargeText } from "@/shared/ui/use-large-text";
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
const OFFER_HINT: Record<(typeof OFFER_MODES)[number], () => string> = {
  none: m.form_offerNoneHint,
  trial: m.form_offerTrialHint,
  intro: m.form_offerIntroHint,
};

const VALIDATION_MESSAGE: Record<FormErrorCode, () => string> = {
  required: m.validation_required,
  invalidNumber: m.validation_invalidNumber,
  positiveNumber: m.validation_positiveNumber,
  wholeNumber: m.validation_wholeNumber,
  futureDate: m.validation_futureDate,
};

/** The fields the price step owns, and the ones edit shows under "Price". */
export const PRICE_STEP_FIELDS = ["name", "cost", "currency", "every"] as const;

export const messageFor = (code: FormErrorCode | undefined) =>
  code ? VALIDATION_MESSAGE[code]() : undefined;

/**
 * What was picked in step one, carried forward so the rest of the form can show
 * it without going back for it.
 */
function BrandRow({ onChange }: { onChange: () => void }) {
  const { values } = useSubscriptionForm();
  const domain = values.brandDomain.trim();
  const stacked = useLargeText();

  return (
    <View style={[styles.brand, stacked && styles.brandStacked]}>
      <View style={styles.brandIdentity}>
        {domain ? (
          <BrandLogo name={values.name} brandDomain={domain} size={36} />
        ) : (
          <View style={styles.brandEmpty} />
        )}
        <View style={styles.brandText}>
          <Text style={styles.brandName}>
            {values.name.trim() || m.form_brandNone()}
          </Text>
          {domain ? <Text style={styles.brandDomain}>{domain}</Text> : null}
        </View>
      </View>
      <Text
        style={styles.brandAction}
        onPress={onChange}
        accessibilityRole="button"
      >
        {m.form_brandChange()}
      </Text>
    </View>
  );
}

/** The category row is a destination, not a control: it pushes the picker. */
function CategoryRow() {
  const router = useRouter();
  const isPro = usePro();
  const { values } = useSubscriptionForm();
  const categories = useQuery(categoriesQuery());

  const selected = categories.data?.find((row) => row.id === values.categoryId);
  // The fourth category surface, and the one that gets missed. Locked, the row
  // wears the badge rather than a value it can never have.
  const value = !isPro
    ? m.paywall_badge()
    : selected
      ? `${selected.emoji} ${selected.name}`
      : m.form_categoryNone();

  return (
    <ValueField
      label={m.form_category()}
      value={value}
      onPress={() =>
        router.push(isPro ? "/subscription-form/category" : "/paywall")
      }
    />
  );
}

/**
 * What the subscription is called, what it costs, and how often.
 *
 * `autoFocus` is opt-in and only the CREATE flow passes it. In edit mode the
 * user came to change one specific thing, and summoning a keyboard over a form
 * they are still reading — scrolling it, at that — helps nobody.
 */
export function PriceFields({
  onChangeBrand,
  autoFocus = false,
}: {
  onChangeBrand: () => void;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const { values, errors, set } = useSubscriptionForm();
  const stacked = useLargeText();

  // Whichever field still needs typing. Step one prefills the name whenever a
  // brand was picked, which is the common path — focusing the name there would
  // put the caret in a field that is already correct and raise the keyboard
  // over the price, the one field that is always empty. Frozen on mount:
  // `autoFocus` is read once by `TextInput`, and recomputing it as the user
  // types would only make the value lie about what happened.
  const [focus] = useState<"name" | "cost">(() =>
    values.name.trim() === "" ? "name" : "cost",
  );

  return (
    <>
      <BrandRow onChange={onChangeBrand} />

      <TextField
        label={m.form_name()}
        value={values.name}
        onChangeText={(next) => set("name", next)}
        error={messageFor(errors.name)}
        autoFocus={autoFocus && focus === "name"}
      />

      {/* One control, the way a native amount field carries its unit: the
          currency is a trailing accessory inside the price box rather than a
          second labelled row. */}
      <Field label={m.form_price()} error={messageFor(errors.cost)}>
        <View
          style={[
            styles.box,
            stacked && styles.boxStacked,
            errors.cost ? styles.boxError : null,
          ]}
        >
          <TextInput
            style={styles.amount}
            value={values.cost}
            onChangeText={(next) => set("cost", next)}
            keyboardType="decimal-pad"
            placeholderTextColor={colors.muted}
            keyboardAppearance="dark"
            autoFocus={autoFocus && focus === "cost"}
          />
          <CurrencyPicker
            value={values.currency}
            onPress={() => router.push("/subscription-form/currency")}
          />
        </View>
      </Field>

      {/* What makes Home's category breakdown say anything: without a value
          here every subscription lands in "Uncategorized". */}
      <CategoryRow />

      {/* "Every 2 months" is one sentence, so it is one row. The count is sized
          for the two digits a real billing cycle uses — a wider box only invites
          a number nobody bills on — and it stretches to the height of the period
          grid beside it. */}
      <Field label={m.form_every()} error={messageFor(errors.every)}>
        <View style={[styles.everyRow, stacked && styles.everyRowStacked]}>
          <TextInput
            style={[
              styles.count,
              stacked && styles.countStacked,
              errors.every ? styles.boxError : null,
            ]}
            value={values.every}
            onChangeText={(next) => set("every", next)}
            keyboardType="number-pad"
            keyboardAppearance="dark"
            accessibilityLabel={m.form_every()}
          />
          {/* No label of its own — the pills announce themselves, and the row
              already reads "Every 2 · months". */}
          <View style={styles.periods}>
            <Pills
              options={PERIODS}
              value={values.period}
              label={(option) => PERIOD_LABEL[option]()}
              onChange={(option) => set("period", option)}
              columns={2}
            />
          </View>
        </View>
      </Field>
    </>
  );
}

/**
 * When it starts, and whether it starts cheap.
 *
 * An offer is part of SIGNING UP. Changing one afterwards is what the
 * manage-pricing sheet does, so edit mode leaves it out entirely.
 */
export function DatesFields() {
  const router = useRouter();
  const isPro = usePro();
  const { id, values, errors, set } = useSubscriptionForm();

  return (
    <>
      {/* The ANCHOR, not the next charge — every future occurrence is
          projected from it, so it is usually in the past. Labelled "next
          payment" it read as a bug on every subscription older than a cycle. */}
      <NativeDateField
        label={m.form_firstPayment()}
        value={values.paymentDate}
        onChange={(date) => set("paymentDate", date)}
      />

      {/* A trial or an intro price IS a pricing phase — the same Pro feature
          the manage-pricing sheet gates. Left open, a free user could create a
          phase they could then never see or change. */}
      {id ? null : !isPro ? (
        <ValueField
          label={m.form_startingOffer()}
          value={m.paywall_badge()}
          onPress={() => router.push("/paywall")}
        />
      ) : (
        <>
          <Field label={m.form_startingOffer()}>
            <View style={styles.offers}>
              {OFFER_MODES.map((option) => (
                <ChoiceRow
                  key={option}
                  title={OFFER_LABEL[option]()}
                  subtitle={OFFER_HINT[option]()}
                  selected={values.offerMode === option}
                  onPress={() => {
                    set("offerMode", option);
                    // An offer has to END in the future, so a field seeded with
                    // today looks answered and fails on save.
                    if (option !== "none" && !values.offerEndsAt) {
                      set("offerEndsAt", tomorrow());
                    }
                  }}
                />
              ))}
            </View>
          </Field>

          {values.offerMode === "none" ? null : (
            <>
              <TextField
                label={m.form_offerCost()}
                value={values.offerCost}
                onChangeText={(next) => set("offerCost", next)}
                keyboardType="decimal-pad"
                placeholder={values.offerMode === "trial" ? "0" : undefined}
                error={messageFor(errors.offerCost)}
              />
              <NativeDateField
                label={m.form_offerEndsAt()}
                value={values.offerEndsAt ?? tomorrow()}
                minimumDate={tomorrow()}
                onChange={(date) => set("offerEndsAt", date)}
                error={messageFor(errors.offerEndsAt)}
              />
            </>
          )}
        </>
      )}

      {id ? null : <Outcome />}
    </>
  );
}

/**
 * The form's own answer, in one sentence, before it is saved.
 *
 * Three fields on this screen decide what the user will actually be charged and
 * when, and none of them says so on its own. It stays quiet until the price
 * parses — a half-typed amount has no outcome to state.
 */
function Outcome() {
  const { values } = useSubscriptionForm();

  const cost = parsePrice(values.cost);
  if (cost === null || cost <= 0) return null;

  const every = Number(values.every) || 1;
  const price = formatMoney(cost, values.currency);
  const cadence = formatCadence(every, values.period);

  const promo =
    values.offerCost.trim() === "" ? 0 : parsePrice(values.offerCost);
  const offerEnd = values.offerEndsAt;

  const line =
    values.offerMode === "none" || !offerEnd || promo === null
      ? m.form_summaryStandard({
          price,
          cadence,
          date: formatShortDate(toIsoDay(values.paymentDate)),
        })
      : promo <= 0
        ? m.form_summaryTrial({
            date: formatShortDate(toIsoDay(offerEnd)),
            price,
            cadence,
          })
        : m.form_summaryIntro({
            promo: formatMoney(promo, values.currency),
            date: formatShortDate(toIsoDay(offerEnd)),
            price,
            cadence,
          });

  return (
    <View style={styles.outcome}>
      <Text style={styles.outcomeLabel}>{m.form_summaryTitle()}</Text>
      <Text style={styles.outcomeBody}>{line}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  brandEmpty: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // "Change" is a control, and at the accessibility sizes it is 53pt of one —
  // beside the name there is nothing left of the name to read.
  brandStacked: { flexDirection: "column", alignItems: "stretch", gap: 10 },
  // `flexBasis: "auto"` rather than `flex: 1`: down the column basis 0 collapses
  // the group to nothing, because an auto-height parent has no free space to
  // grow back into.
  brandIdentity: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "auto",
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandText: { flex: 1, minWidth: 0 },
  brandName: { fontSize: 16, fontWeight: "600", color: colors.text },
  brandDomain: { fontSize: 12.5, color: colors.muted },
  brandAction: { fontSize: 15, fontWeight: "600", color: colors.accent },
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
  // The unit stops being a trailing accessory and becomes the row under the
  // amount — `CurrencyPicker` turns its own dividing edge with it.
  boxStacked: { flexDirection: "column", alignItems: "stretch" },
  boxError: { borderColor: colors.danger },
  amount: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  everyRow: { flexDirection: "row", alignItems: "stretch", gap: 10 },
  // 64pt is two digits at 16pt; at 57pt it is not one. The count takes a line of
  // its own rather than a width that has to keep guessing.
  everyRowStacked: { flexDirection: "column", alignItems: "stretch" },
  count: {
    width: 64,
    fontSize: 16,
    color: colors.text,
    textAlign: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
  },
  countStacked: { width: "100%", paddingVertical: 12 },
  periods: { flex: 1 },
  offers: { gap: 8 },
  outcome: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  outcomeLabel: {
    marginBottom: 4,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.muted,
  },
  outcomeBody: { fontSize: 14, lineHeight: 20, color: colors.text },
});
