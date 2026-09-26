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
import { BrandBackdrop } from "@/shared/ui/brand-backdrop";
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
import { useSubscriptionForm } from "../model/form-context";
import { BrandEditButton } from "./brand-edit-button";
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
 *
 * Wearing the SAME brand wash as the detail banner, because it is answering the
 * same question — which subscription is this — and a form that opens on a grey
 * card has thrown that answer away between one screen and the next. Both sides
 * draw it through `BrandBackdrop`, so the blur is tuned in one place.
 *
 * The wash only appears once a brand has been picked. Empty, there is nothing
 * to be coloured by, and a flat scrim over the plain surface would just make
 * this the one dark card on the form.
 */
function BrandRow({ onChange }: { onChange: () => void }) {
  const { values } = useSubscriptionForm();
  const domain = values.brandDomain.trim();

  return (
    <View style={styles.brand}>
      {domain ? (
        <View style={styles.brandWash}>
          <BrandBackdrop domain={domain}>
            {/* Flat, not the banner's ramp: a gradient's stops are
                percentages, and across 60pt of card they would put the logo in
                the light end and the glass button in the dark one. */}
            <View style={styles.brandScrim} />
            {/* The white tint every glass surface in this app carries, and the
                value the banner's own segment bar uses. Its own layer rather
                than the card's background, which sits BEHIND the absolutely
                positioned wash and would never be seen. */}
            <View style={styles.brandGlass} />
          </BrandBackdrop>
        </View>
      ) : null}

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
      <BrandEditButton onPress={onChange} />
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
  // `overflow: "hidden"` is what clips the wash to the corners — without it the
  // blurred plate is a square behind a rounded card.
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  // 0.46 against the banner's 0.40, and the gap is the type: the banner sets a
  // 26pt/800 name on that value, this card sets 16pt/600 and a 12.5pt caption
  // under it. Any more and the brand is gone — at 0.55 every logo came out the
  // same sage grey, which is the failure the blur tuning exists to avoid.
  // Out past the 1pt border on every side, and this is not cosmetic. The
  // blurred plate is `scale(2.6)`, so it spills under the border and is clipped
  // only by the card's own bounds — while the scrims, positioned against the
  // PADDING box, stop 1pt short. A translucent border over raw saturated
  // favicon is a bright green rim around the whole card. Everything the wash is
  // made of has to reach the same edge.
  brandWash: { position: "absolute", top: -1, left: -1, right: -1, bottom: -1 },
  brandScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(15,17,21,0.62)",
  },
  brandGlass: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  brandEmpty: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // `flexBasis: "auto"` rather than `flex: 1`: the row's height comes from its
  // content, and basis 0 in an auto-height parent has no free space to grow back
  // into. The name simply wraps at the accessibility sizes now — the icon button
  // beside it is a fixed 44pt, which is what let the stacked variant go.
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
  // Only ever drawn over the wash, so it takes the banner's caption colour
  // rather than `muted` — grey on a saturated brand is the one pair that goes
  // unreadable.
  brandDomain: { fontSize: 12.5, color: "rgba(242,244,248,0.72)" },
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
