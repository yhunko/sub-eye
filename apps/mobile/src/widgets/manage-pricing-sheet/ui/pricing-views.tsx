import type {
  OfferStartMode,
  PricePhaseDto,
  StartPhaseInput,
  SubscriptionDto,
} from "@subeye/model";
import { RecurrenceUtils } from "@subeye/time";
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

/** How many charges a fresh offer covers until told otherwise. */
const DEFAULT_OFFER_PAYMENTS = 3;
const MAX_OFFER_PAYMENTS = 60;

/**
 * The charge the offer reverts on: `count` whole cycles past the first covered
 * one.
 *
 * `RecurrenceUtils` and not hand-rolled month maths, because this must agree
 * with `startPricingSchedule`, which derives the authoritative boundary the
 * same way — a preview that disagreed with the write would be worse than no
 * preview at all. Month-end anchoring (the 31st) is exactly why neither side
 * adds months by hand.
 */
const revertDate = (
  subscription: SubscriptionDto,
  count: number,
): Date | null => {
  const first = new Date(subscription.nextPaymentDate);
  if (Number.isNaN(first.getTime())) return null;

  let boundary = first;
  for (let taken = 0; taken < count; taken += 1) {
    boundary = RecurrenceUtils.addPeriod(
      boundary,
      subscription.every,
      subscription.period,
      { anchorDate: first },
    );
  }
  return boundary;
};

/** The last charge the offer still covers. */
const lastCoveredDate = (
  subscription: SubscriptionDto,
  count: number,
): Date | null => revertDate(subscription, count - 1);

/** − N + . The one control that turns "three months" into a date nobody types. */
function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  const step = (delta: number) => {
    const next = value + delta;
    if (next < min || next > max) return;
    onChange(next);
  };

  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="−"
        disabled={value <= min}
        onPress={() => step(-1)}
        style={({ pressed }) => [
          styles.stepperButton,
          value <= min && styles.stepperButtonOff,
          pressed && styles.stepperButtonPressed,
        ]}
      >
        <SymbolView
          name={{ ios: "minus", android: "remove" }}
          size={17}
          tintColor={value <= min ? colors.muted : colors.text}
          weight="semibold"
        />
      </Pressable>
      <Text
        style={styles.stepperValue}
        accessibilityLiveRegion="polite"
        maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
      >
        {value}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="+"
        disabled={value >= max}
        onPress={() => step(1)}
        style={({ pressed }) => [
          styles.stepperButton,
          value >= max && styles.stepperButtonOff,
          pressed && styles.stepperButtonPressed,
        ]}
      >
        <SymbolView
          name={{ ios: "plus", android: "add" }}
          size={17}
          tintColor={value >= max ? colors.muted : colors.text}
          weight="semibold"
        />
      </Pressable>
    </View>
  );
}

/**
 * A different price for the next few charges, then back to normal.
 *
 * ONE form, where there were two. "Free trial" and "intro discount" were the
 * same three fields with the price prefilled to 0 — the user had to pick
 * between two menu entries that produced identical screens and identical
 * timelines, and neither name fitted the cases people actually have: a promo
 * mid-subscription, a retention offer taken while cancelling, a goodwill month.
 * A price of 0 is free; anything above it is a discount; the store decides
 * which kind to record. Nothing else about them ever differed.
 *
 * The length is a number of CHARGES, not a date. Asking for a date was the
 * whole problem: the window is half-open, so the date of the last covered
 * payment silently bought one payment fewer, and the user had to do calendar
 * arithmetic to find a date the app already knows.
 *
 * `startMode` is the other half. An offer taken mid-cycle begins at the NEXT
 * charge — the period already paid for was not discounted — and defaulting to
 * that is why the form no longer rewrites today's price behind the user.
 */
export function TemporaryPriceView({
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
  const [startMode, setStartMode] = useState<OfferStartMode>("nextPayment");
  const [payments, setPayments] = useState(DEFAULT_OFFER_PAYMENTS);
  const [promo, setPromo] = useState("");
  const [standard, setStandard] = useState("");
  const [promoError, setPromoError] = useState<string>();
  const [standardError, setStandardError] = useState<string>();

  const { currency, every, period } = subscription;
  // The price the offer reverts to defaults to what is being paid today, which
  // is right whenever the offer is a discount on the current plan.
  const standardFallback = subscription.cost;

  // A blank field means free, and the placeholder says so. Typing is only
  // needed for the discount case.
  const parsedPromo = promo.trim() === "" ? 0 : parsePrice(promo);
  const parsedStandard =
    standard.trim() === "" ? standardFallback : parsePrice(standard);

  const submit = () => {
    if (parsedPromo === null || parsedPromo < 0) {
      setPromoError(m.validation_invalidNumber());
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

    onSubmit({
      kind: "temporaryPrice",
      promoCost: parsedPromo,
      currency,
      startMode,
      payments,
      standardCost: parsedStandard,
    });
  };

  const cadence = formatCadence(every, period);
  const standardText = formatMoney(
    parsedStandard ?? standardFallback,
    currency,
  );
  const reverts = revertDate(subscription, payments);
  const lastCovered = lastCoveredDate(subscription, payments);

  return (
    <>
      <SheetHeader
        title={m.pricing_temporaryTitle()}
        subtitle={subtitle}
        onClose={onClose}
      />

      <Field label={m.pricing_offerStarts()}>
        <View style={styles.choices}>
          <ChoiceRow
            title={m.pricing_startNextPayment()}
            subtitle={formatShortDate(subscription.nextPaymentDate)}
            selected={startMode === "nextPayment"}
            onPress={() => setStartMode("nextPayment")}
          />
          <ChoiceRow
            title={m.pricing_startNow()}
            subtitle={m.pricing_startNowHint()}
            selected={startMode === "now"}
            onPress={() => setStartMode("now")}
          />
        </View>
      </Field>

      <Field label={m.pricing_offerLength()}>
        <Stepper
          value={payments}
          min={1}
          max={MAX_OFFER_PAYMENTS}
          onChange={setPayments}
        />
        {/* Shown before a price is even typed: the count is the commitment, so
            the date it lands on must never be something the user has to work
            out — that arithmetic was the bug. */}
        {reverts ? (
          <Text style={styles.stepperHint}>
            {m.pricing_offerRevertsOn({
              date: formatShortDate(reverts.toISOString()),
            })}
          </Text>
        ) : null}
      </Field>

      <AmountField
        label={m.form_offerCost()}
        value={promo}
        onChangeText={setPromo}
        // The placeholder is the whole reason this is one form rather than two:
        // it says, without a second menu entry, that free is just a price.
        placeholder="0"
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

      {parsedStandard !== null &&
      parsedStandard > 0 &&
      parsedPromo !== null &&
      reverts &&
      lastCovered ? (
        <Outcome
          title={m.pricing_summaryTitle()}
          lines={[
            // Named dates rather than a count: Ukrainian agrees its plural with
            // the number, and "з 25 вер. по 25 лис." says the same thing
            // without needing to. "Free" reads as a price in the same slot.
            m.pricing_summaryOfferWindow({
              promo:
                parsedPromo > 0
                  ? formatMoney(parsedPromo, currency)
                  : m.pricing_free(),
              first: formatShortDate(subscription.nextPaymentDate),
              last: formatShortDate(lastCovered.toISOString()),
              price: standardText,
              cadence,
              revert: formatShortDate(reverts.toISOString()),
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

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    padding: 4,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
  },
  stepperButtonOff: { opacity: 0.4 },
  stepperButtonPressed: { opacity: 0.6 },
  // Wide enough for two digits so the buttons do not shuffle sideways as the
  // number grows.
  stepperValue: {
    minWidth: 44,
    textAlign: "center",
    fontSize: 19,
    fontWeight: "700",
    color: colors.text,
  },
  stepperHint: { marginTop: 8, fontSize: 12.5, color: colors.muted },

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
