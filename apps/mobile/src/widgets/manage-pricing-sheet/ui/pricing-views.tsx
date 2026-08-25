import type {
  PricePhaseDto,
  StartPhaseInput,
  SubscriptionDto,
} from "@subeye/model";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { m } from "@/shared/i18n";
import {
  formatCadence,
  formatMoney,
  formatShortDate,
  isFutureDay,
  parsePrice,
  toIsoDay,
  tomorrow,
} from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { ChoiceRow } from "@/shared/ui/choice-row";
import { Field } from "@/shared/ui/field";
import { NativeDateField } from "@/shared/ui/native-date-field";
import { colors, LAYOUT_FONT_SCALE_MAX } from "@/shared/ui/theme";
import { yearlyDifference } from "../model/yearly-difference";

/** Mirrors the store's `scheduledPriceChangeModes`. */
type EffectiveMode = "nextOccurrence" | "customDate";

const EFFECTIVE_LABEL: Record<EffectiveMode, () => string> = {
  nextOccurrence: m.pricing_effectiveNextOccurrence,
  customDate: m.pricing_effectiveCustomDate,
};

/**
 * One intent, its context, and the way out.
 *
 * A CLOSE button, not a back one: the menu that chose this intent is a UIMenu in
 * the nav bar behind the sheet, so there is no previous screen to return to.
 */
export function SheetHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text
          style={styles.title}
          maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
        >
          {title}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={m.common_cancel()}
        onPress={onClose}
        style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
      >
        <SymbolView
          name={{ ios: "xmark", android: "close" }}
          size={14}
          tintColor={colors.text}
          weight="semibold"
        />
      </Pressable>
    </View>
  );
}

/**
 * An amount, with the fact that gives it meaning sitting inside the same box —
 * what the price is today, that zero means free, that a blank field is already
 * correct. Every one of these fields used to be an empty rectangle.
 */
function AmountField({
  label,
  value,
  onChangeText,
  hint,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  hint?: string;
  placeholder?: string;
  error?: string;
}) {
  return (
    <Field label={label} error={error}>
      <View style={[styles.amountBox, error ? styles.amountError : null]}>
        <TextInput
          style={styles.amount}
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          keyboardAppearance="dark"
        />
        {hint ? <Text style={styles.amountHint}>{hint}</Text> : null}
      </View>
    </Field>
  );
}

/** What a change adds up to, said once, above the button that commits it. */
function Outcome({ title, lines }: { title: string; lines: string[] }) {
  return (
    <View style={styles.outcome}>
      <Text style={styles.outcomeLabel}>{title}</Text>
      <Text style={styles.outcomeBody}>{lines.join(" ")}</Text>
    </View>
  );
}

/** A new standard price, from the next payment or from a date of its own. */
export function ScheduleView({
  subscription,
  subtitle,
  onClose,
  onSubmit,
}: {
  subscription: SubscriptionDto;
  subtitle: string;
  onClose: () => void;
  onSubmit: (phase: StartPhaseInput) => void;
}) {
  const [price, setPrice] = useState("");
  const [effective, setEffective] = useState<EffectiveMode>("nextOccurrence");
  const [date, setDate] = useState(tomorrow);
  const [priceError, setPriceError] = useState<string>();
  const [dateError, setDateError] = useState<string>();

  const { currency, cost, every, period } = subscription;
  const parsed = parsePrice(price);
  const effectiveAt =
    effective === "customDate" ? toIsoDay(date) : subscription.nextPaymentDate;

  const submit = () => {
    if (parsed === null) {
      setPriceError(m.validation_invalidNumber());
      return;
    }
    if (parsed <= 0) {
      setPriceError(m.validation_positiveNumber());
      return;
    }
    setPriceError(undefined);

    // Only "custom date" sends one; on "next payment" the store picks the day.
    if (effective === "customDate" && !isFutureDay(date)) {
      setDateError(m.validation_futureDate());
      return;
    }
    setDateError(undefined);

    onSubmit({
      kind: "scheduledChange",
      cost: parsed,
      currency,
      mode: effective,
      customDate: effective === "customDate" ? toIsoDay(date) : undefined,
    });
  };

  const delta =
    parsed === null ? 0 : yearlyDifference(cost, parsed, every, period);

  return (
    <>
      <SheetHeader
        title={m.pricing_scheduleTitle()}
        subtitle={subtitle}
        onClose={onClose}
      />

      <AmountField
        label={m.pricing_newPrice()}
        value={price}
        onChangeText={setPrice}
        hint={m.pricing_wasPrice({ price: formatMoney(cost, currency) })}
        error={priceError}
      />

      <Field label={m.pricing_effectiveFrom()}>
        <View style={styles.choices}>
          <ChoiceRow
            title={EFFECTIVE_LABEL.nextOccurrence()}
            subtitle={formatShortDate(subscription.nextPaymentDate)}
            selected={effective === "nextOccurrence"}
            onPress={() => setEffective("nextOccurrence")}
          />
          <ChoiceRow
            title={EFFECTIVE_LABEL.customDate()}
            subtitle={m.pricing_effectiveCustomHint()}
            selected={effective === "customDate"}
            onPress={() => setEffective("customDate")}
          />
        </View>
      </Field>

      {effective === "customDate" ? (
        <NativeDateField
          label={m.pricing_effectiveFrom()}
          value={date}
          minimumDate={tomorrow()}
          onChange={setDate}
          error={dateError}
        />
      ) : null}

      {parsed !== null && parsed > 0 ? (
        <Outcome
          title={m.pricing_summaryTitle()}
          lines={[
            m.pricing_summaryChange({
              date: formatShortDate(effectiveAt),
              to: formatMoney(parsed, currency),
              from: formatMoney(cost, currency),
            }),
            ...(Math.abs(delta) < 0.01
              ? []
              : [
                  delta > 0
                    ? m.pricing_summaryYearlyMore({
                        delta: formatMoney(delta, currency),
                      })
                    : m.pricing_summaryYearlyLess({
                        delta: formatMoney(-delta, currency),
                      }),
                ]),
          ]}
        />
      ) : null}

      <View style={styles.commit}>
        <Button label={m.form_save()} onPress={submit} />
      </View>
    </>
  );
}

/**
 * A trial or an intro discount: a price that runs until a date and then reverts.
 *
 * The date comes FIRST because it is the decision. Both prices are prefilled
 * with the answer that is almost always right — nothing, then what is being paid
 * today — so an untouched form is already correct.
 */
export function OfferView({
  subscription,
  kind,
  subtitle,
  onClose,
  onSubmit,
}: {
  subscription: SubscriptionDto;
  kind: "trial" | "intro";
  subtitle: string;
  onClose: () => void;
  onSubmit: (phase: StartPhaseInput) => void;
}) {
  const [date, setDate] = useState(tomorrow);
  const [promo, setPromo] = useState("");
  const [standard, setStandard] = useState("");
  const [promoError, setPromoError] = useState<string>();
  const [standardError, setStandardError] = useState<string>();
  const [dateError, setDateError] = useState<string>();

  const { currency, every, period } = subscription;
  // The price the offer reverts to defaults to what is being paid today, which
  // is right whenever the offer is a discount on the current plan.
  const standardFallback = subscription.cost;

  // A blank price on a free trial means free. On an intro it means unanswered,
  // and blank must not quietly become a zero the store then rejects.
  const parsedPromo =
    kind === "trial" && promo.trim() === "" ? 0 : parsePrice(promo);
  const parsedStandard =
    standard.trim() === "" ? standardFallback : parsePrice(standard);

  const submit = () => {
    if (parsedPromo === null) {
      setPromoError(m.validation_invalidNumber());
      return;
    }
    // A "discount" of nothing is a free trial. Forcing the distinction keeps the
    // price timeline honest about what was signed up for.
    if (kind === "intro" && parsedPromo <= 0) {
      setPromoError(m.validation_positiveNumber());
      return;
    }
    setPromoError(undefined);

    if (parsedStandard === null) {
      setStandardError(m.validation_invalidNumber());
      return;
    }
    if (parsedStandard <= 0) {
      setStandardError(m.validation_positiveNumber());
      return;
    }
    setStandardError(undefined);

    if (!isFutureDay(date)) {
      setDateError(m.validation_futureDate());
      return;
    }
    setDateError(undefined);

    onSubmit({
      kind,
      promoCost: parsedPromo,
      currency,
      endsAt: toIsoDay(date),
      standardCost: parsedStandard,
    });
  };

  const cadence = formatCadence(every, period);
  const standardText = formatMoney(
    parsedStandard ?? standardFallback,
    currency,
  );
  const day = formatShortDate(toIsoDay(date));

  return (
    <>
      <SheetHeader
        title={
          kind === "trial" ? m.pricing_trialTitle() : m.pricing_introTitle()
        }
        subtitle={subtitle}
        onClose={onClose}
      />

      <NativeDateField
        label={m.form_offerEndsAt()}
        value={date}
        minimumDate={tomorrow()}
        onChange={setDate}
        error={dateError}
      />

      <AmountField
        label={m.form_offerCost()}
        value={promo}
        onChangeText={setPromo}
        placeholder={kind === "trial" ? "0" : undefined}
        hint={
          parsedPromo !== null && parsedPromo <= 0
            ? m.pricing_free()
            : undefined
        }
        error={promoError}
      />

      <AmountField
        label={m.pricing_standardCost()}
        value={standard}
        onChangeText={setStandard}
        placeholder={formatMoney(standardFallback, currency)}
        hint={standard.trim() === "" ? m.pricing_asNow() : undefined}
        error={standardError}
      />

      {parsedStandard !== null && parsedStandard > 0 && parsedPromo !== null ? (
        <Outcome
          title={m.pricing_summaryTitle()}
          lines={[
            parsedPromo <= 0
              ? m.form_summaryTrial({
                  date: day,
                  price: standardText,
                  cadence,
                })
              : m.form_summaryIntro({
                  promo: formatMoney(parsedPromo, currency),
                  date: day,
                  price: standardText,
                  cadence,
                }),
          ]}
        />
      ) : null}

      <View style={styles.commit}>
        <Button label={m.form_save()} onPress={submit} />
      </View>
    </>
  );
}

/** The change that has not happened yet, and both ways out of it. */
export function PendingView({
  subscription,
  phase,
  subtitle,
  onClose,
  onApply,
  onCancel,
}: {
  subscription: SubscriptionDto;
  phase: PricePhaseDto;
  subtitle: string;
  onClose: () => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  const { currency, every, period } = subscription;

  // The charge before the change lands. A scheduled change effective ON the next
  // payment leaves none, so there is nothing true to say and the block is gone
  // rather than claiming a payment that never happens at the old price.
  const unchanged =
    Date.parse(subscription.nextPaymentDate) < Date.parse(phase.startsAt)
      ? subscription.nextPaymentDate
      : null;

  return (
    <>
      <SheetHeader
        title={m.pricing_pendingTitle()}
        subtitle={subtitle}
        onClose={onClose}
      />

      <View style={styles.card}>
        <View style={styles.transition}>
          <Text style={styles.from}>
            {formatMoney(subscription.cost, currency)}
          </Text>
          <SymbolView
            name={{ ios: "arrow.right", android: "arrow_forward" }}
            size={17}
            tintColor={colors.muted}
            weight="semibold"
          />
          <Text style={styles.to}>
            {formatMoney(phase.cost, phase.currency)}
          </Text>
        </View>
        <Text style={styles.cardFoot}>
          {m.pricing_pendingFrom({
            date: formatShortDate(phase.startsAt),
            cadence: formatCadence(every, period),
          })}
        </Text>
      </View>

      {unchanged ? (
        <Outcome
          title={m.pricing_untilThen()}
          lines={[
            m.pricing_untilThenBody({
              date: formatShortDate(unchanged),
              price: formatMoney(subscription.cost, currency),
            }),
          ]}
        />
      ) : null}

      <View style={styles.actions}>
        <Button label={m.pricing_applyNow()} onPress={onApply} />
        <Button
          label={m.pricing_cancelPhase()}
          variant="secondary"
          onPress={onCancel}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 20,
  },
  headerText: { flex: 1, minWidth: 0 },
  close: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
  },
  closePressed: { opacity: 0.6 },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  subtitle: { marginTop: 3, fontSize: 13, color: colors.muted },

  amountBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  amountError: { borderColor: colors.danger },
  amount: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: 12 },
  amountHint: { fontSize: 13, color: colors.muted },

  choices: { gap: 8 },

  outcome: {
    marginBottom: 18,
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

  card: {
    marginBottom: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 18,
  },
  transition: { flexDirection: "row", alignItems: "baseline", gap: 10 },
  from: {
    fontSize: 20,
    color: colors.muted,
    textDecorationLine: "line-through",
  },
  to: { fontSize: 32, fontWeight: "700", color: colors.text },
  cardFoot: { marginTop: 8, fontSize: 14, color: colors.muted },

  commit: { marginTop: 4 },
  actions: { gap: 10 },
});
