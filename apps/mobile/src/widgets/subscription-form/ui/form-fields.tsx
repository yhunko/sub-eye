import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { categoriesQuery } from "@/entities/category";
import { usePro } from "@/entities/pro";
import { m } from "@/shared/i18n";
import {
  daysUntil,
  formatCadence,
  formatCountdown,
  formatMoney,
  formatShortDate,
  parsePrice,
  toIsoDay,
  tomorrow,
} from "@/shared/lib/format";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { ChoiceRow } from "@/shared/ui/choice-row";
import { CurrencyPicker } from "@/shared/ui/currency-picker";
import {
  Field,
  FormRow,
  FormSection,
  TextRow,
  ValueRow,
} from "@/shared/ui/field";
import { DatePicker } from "@/shared/ui/native-date-field";
import { colors } from "@/shared/ui/theme";
import { useLargeText } from "@/shared/ui/use-large-text";
import { useSubscriptionForm } from "../model/form-context";
import { CadenceField } from "./cadence-field";
import { messageFor } from "./validation-message";

// Message-function references, invoked at render time — never called at module
// scope, or the string freezes in whichever locale was active at import.
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

/** The fields the price step owns, and the ones edit shows under "Price". */
export const PRICE_STEP_FIELDS = ["name", "cost", "currency", "every"] as const;

/** "in 31 days" beside a date, and nothing at all behind one. */
const countdownFor = (date: Date) => {
  const days = daysUntil(toIsoDay(date));
  return days >= 0 ? formatCountdown(days) : undefined;
};

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
    <ValueRow
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
 * The rows are UIKit's grouped-form shape — label left, control right — rather
 * than a stack of full-width boxes under their labels. A price is four
 * characters and a name is three words; giving each one the whole screen width
 * made a six-question form scroll, and scrolling is what a form of short
 * answers should never do.
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

      <FormSection>
        <TextRow
          label={m.form_name()}
          value={values.name}
          onChangeText={(next) => set("name", next)}
          error={messageFor(errors.name)}
          autoFocus={autoFocus && focus === "name"}
        />

        {/* One row, the way a native amount field carries its unit: the
            currency is a trailing accessory inside the price field rather than
            a second labelled row. */}
        <TextRow
          label={m.form_price()}
          value={values.cost}
          onChangeText={(next) => set("cost", next)}
          error={messageFor(errors.cost)}
          keyboardType="decimal-pad"
          // An empty right-aligned field beside a currency chip is a blank
          // stretch of card with nothing to say it is a field at all.
          placeholder="0"
          autoFocus={autoFocus && focus === "cost"}
          trailing={
            <CurrencyPicker
              value={values.currency}
              onPress={() => router.push("/subscription-form/currency")}
            />
          }
        />

        {/* What makes Home's category breakdown say anything: without a value
            here every subscription lands in "Uncategorized". */}
        <CategoryRow />
      </FormSection>

      <FormSection>
        <CadenceField />
      </FormSection>
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
      <FormSection>
        {/* The ANCHOR, not the next charge — every future occurrence is
            projected from it, so it is usually in the past. Labelled "next
            payment" it read as a bug on every subscription older than a cycle,
            and the countdown stays off behind it for the same reason. */}
        <FormRow
          label={m.form_firstPayment()}
          subtitle={countdownFor(values.paymentDate)}
        >
          <DatePicker
            label={m.form_firstPayment()}
            value={values.paymentDate}
            onChange={(date) => set("paymentDate", date)}
          />
        </FormRow>
      </FormSection>

      {/* A trial or an intro price IS a pricing phase — the same Pro feature
          the manage-pricing sheet gates. Left open, a free user could create a
          phase they could then never see or change. */}
      {id ? null : !isPro ? (
        <FormSection>
          <ValueRow
            label={m.form_startingOffer()}
            value={m.paywall_badge()}
            onPress={() => router.push("/paywall")}
          />
        </FormSection>
      ) : (
        <>
          <Field label={m.form_startingOffer()} gap={20}>
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
            <FormSection>
              <TextRow
                label={m.form_offerCost()}
                value={values.offerCost}
                onChangeText={(next) => set("offerCost", next)}
                keyboardType="decimal-pad"
                placeholder={values.offerMode === "trial" ? "0" : undefined}
                error={messageFor(errors.offerCost)}
              />
              <FormRow
                label={m.form_offerEndsAt()}
                subtitle={countdownFor(values.offerEndsAt ?? tomorrow())}
                error={messageFor(errors.offerEndsAt)}
              >
                <DatePicker
                  label={m.form_offerEndsAt()}
                  value={values.offerEndsAt ?? tomorrow()}
                  minimumDate={tomorrow()}
                  onChange={(date) => set("offerEndsAt", date)}
                />
              </FormRow>
            </FormSection>
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
