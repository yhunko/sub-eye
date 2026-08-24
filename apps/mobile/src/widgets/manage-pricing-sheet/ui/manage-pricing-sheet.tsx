import type { StartPhaseInput } from "@subeye/model";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useApplyPhaseNow,
  useCancelPhase,
  useStartPhase,
  useSubscriptionDetail,
} from "@/entities/subscription";
import { m } from "@/shared/i18n";
import {
  formatMoney,
  isFutureDay,
  parsePrice,
  toIsoDay,
} from "@/shared/lib/format";
import { Field, TextField } from "@/shared/ui/field";
import { NativeDateField } from "@/shared/ui/native-date-field";
import { Segmented } from "@/shared/ui/segmented";
import { colors } from "@/shared/ui/theme";

type Mode = "offer" | "schedule" | "pending";
type OfferKind = "trial" | "intro";
/** Mirrors the server's `scheduledPriceChangeModes`. */
type EffectiveMode = "nextOccurrence" | "customDate";

const MODE_LABEL: Record<Mode, () => string> = {
  offer: m.pricing_modeOffer,
  schedule: m.pricing_modeSchedule,
  pending: m.pricing_modePending,
};

const OFFER_LABEL: Record<OfferKind, () => string> = {
  trial: m.form_offerTrial,
  intro: m.form_offerIntro,
};

const EFFECTIVE_LABEL: Record<EffectiveMode, () => string> = {
  nextOccurrence: m.pricing_effectiveNextOccurrence,
  customDate: m.pricing_effectiveCustomDate,
};

const tomorrow = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

/**
 * Three ways to put a price on the timeline, over one endpoint:
 *
 *  - offer    → POST /:id/phases { kind: trial|intro, promoCost, endsAt, standardCost }
 *               starts now and reverts to standardCost on endsAt.
 *  - schedule → POST /:id/phases { kind: scheduledChange, cost, mode, customDate? }
 *               replaces the standard price, either on the next payment or a date.
 *  - pending  → apply early or drop the phase that has not taken effect yet.
 */
export function ManagePricingSheet({ id }: { id: string }) {
  const router = useRouter();
  const { data: subscription } = useSubscriptionDetail(id);

  const startPhase = useStartPhase();
  const applyNow = useApplyPhaseNow();
  const cancelPhase = useCancelPhase();

  // The server already tells us which phase is queued — no scanning the
  // timeline for one, and no disagreeing with it about which that is.
  const pending = subscription?.upcomingPhase ?? null;

  const [mode, setMode] = useState<Mode>("offer");
  const [offerKind, setOfferKind] = useState<OfferKind>("trial");
  const [effective, setEffective] = useState<EffectiveMode>("nextOccurrence");
  const [price, setPrice] = useState("");
  const [standardCost, setStandardCost] = useState("");
  const [date, setDate] = useState(tomorrow);
  const [priceError, setPriceError] = useState<string>();
  const [standardError, setStandardError] = useState<string>();
  const [dateError, setDateError] = useState<string>();

  if (!subscription) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.muted} />
      </View>
    );
  }

  const currency = subscription.currency;
  // The price the offer reverts to defaults to what is being paid today, which
  // is right whenever the offer is a discount on the current plan.
  const standardFallback = subscription.cost;

  const submit = () => {
    const parsedPrice =
      mode === "offer" && offerKind === "trial" && price.trim() === ""
        ? 0
        : parsePrice(price);
    let invalid = false;

    if (parsedPrice === null) {
      setPriceError(m.validation_invalidNumber());
      invalid = true;
    } else if (
      parsedPrice <= 0 &&
      !(mode === "offer" && offerKind === "trial")
    ) {
      // A scheduled change and an intro discount must both cost something; only
      // a free trial may be zero.
      setPriceError(m.validation_positiveNumber());
      invalid = true;
    } else {
      setPriceError(undefined);
    }

    const parsedStandard =
      standardCost.trim() === "" ? standardFallback : parsePrice(standardCost);

    if (mode === "offer") {
      if (parsedStandard === null) {
        setStandardError(m.validation_invalidNumber());
        invalid = true;
      } else if (parsedStandard <= 0) {
        setStandardError(m.validation_positiveNumber());
        invalid = true;
      } else {
        setStandardError(undefined);
      }
    }

    // A date is only required where one is actually sent: every offer ends on
    // one, but a scheduled change on "next payment" has the server pick it.
    const needsDate = mode === "offer" || effective === "customDate";
    if (needsDate && !isFutureDay(date)) {
      setDateError(m.validation_futureDate());
      invalid = true;
    } else {
      setDateError(undefined);
    }

    if (invalid || parsedPrice === null) return;

    const phase: StartPhaseInput =
      mode === "schedule"
        ? {
            kind: "scheduledChange",
            cost: parsedPrice,
            currency,
            mode: effective,
            customDate: effective === "customDate" ? toIsoDay(date) : undefined,
          }
        : {
            kind: offerKind,
            promoCost: parsedPrice,
            currency,
            endsAt: toIsoDay(date),
            standardCost: parsedStandard ?? standardFallback,
          };

    startPhase.mutate({ id, phase });
    router.back();
  };

  return (
    <ScrollView
      style={styles.sheet}
      contentContainerStyle={styles.content}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>{m.pricing_title()}</Text>

      <View style={styles.modes}>
        <Segmented
          options={["offer", "schedule", "pending"] as const}
          value={mode}
          label={(option) => MODE_LABEL[option]()}
          onChange={setMode}
        />
      </View>

      {mode === "pending" ? (
        pending ? (
          <View style={styles.pending}>
            <Text style={styles.pendingPrice}>
              {formatMoney(pending.cost, pending.currency)}
            </Text>
            <Pressable
              style={styles.primary}
              accessibilityRole="button"
              onPress={() => {
                applyNow.mutate({ id, phaseId: pending.id });
                router.back();
              }}
            >
              <Text style={styles.primaryLabel}>{m.pricing_applyNow()}</Text>
            </Pressable>
            <Pressable
              style={styles.secondary}
              accessibilityRole="button"
              onPress={() => {
                cancelPhase.mutate({ id, phaseId: pending.id });
                router.back();
              }}
            >
              <Text style={styles.secondaryLabel}>
                {m.pricing_cancelPhase()}
              </Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.empty}>{m.pricing_noPending()}</Text>
        )
      ) : (
        <>
          {mode === "offer" ? (
            <Field label={m.form_startingOffer()}>
              <Segmented
                options={["trial", "intro"] as const}
                value={offerKind}
                label={(option) => OFFER_LABEL[option]()}
                onChange={setOfferKind}
              />
            </Field>
          ) : (
            <Field label={m.pricing_effectiveFrom()}>
              <Segmented
                options={["nextOccurrence", "customDate"] as const}
                value={effective}
                label={(option) => EFFECTIVE_LABEL[option]()}
                onChange={setEffective}
              />
            </Field>
          )}

          <TextField
            label={
              mode === "schedule" ? m.pricing_newPrice() : m.form_offerCost()
            }
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            error={priceError}
          />

          {mode === "offer" ? (
            <TextField
              label={m.pricing_standardCost()}
              value={standardCost}
              onChangeText={setStandardCost}
              keyboardType="decimal-pad"
              placeholder={formatMoney(standardFallback, currency)}
              error={standardError}
            />
          ) : null}

          {mode === "offer" || effective === "customDate" ? (
            <NativeDateField
              label={
                mode === "schedule"
                  ? m.pricing_effectiveFrom()
                  : m.form_offerEndsAt()
              }
              value={date}
              minimumDate={new Date()}
              onChange={setDate}
              error={dateError}
            />
          ) : null}

          <Pressable
            style={styles.primary}
            onPress={submit}
            accessibilityRole="button"
          >
            <Text style={styles.primaryLabel}>{m.form_save()}</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    paddingVertical: 48,
  },
  title: {
    marginBottom: 20,
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  modes: { marginBottom: 16 },
  pending: { gap: 12 },
  pendingPrice: { fontSize: 22, fontWeight: "700", color: colors.text },
  empty: { fontSize: 15, color: colors.muted },
  primary: {
    marginTop: 8,
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 13,
  },
  primaryLabel: { fontSize: 15, fontWeight: "700", color: colors.bg },
  secondary: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 13,
  },
  secondaryLabel: { fontSize: 15, color: colors.text },
});
