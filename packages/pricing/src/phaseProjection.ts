import type { RateTable } from "@subeye/currency";
import type {
  PricePhaseDto,
  PricePhaseKind,
  SubscriptionDto,
  SubscriptionPeriod,
} from "@subeye/shared";
import { SubscriptionCalculator } from "@subeye/spend";
import { getUpcomingPhase } from "./phaseSelection";

/** The minimum shape of a stored pricing-phase row. A DB row satisfies it. */
export type PricePhaseInput = {
  id: string;
  kind: PricePhaseKind;
  cost: string | number;
  currency: string;
  startsAt: string;
  endsAt?: string | null;
};

/** How often the subscription recurs — needed to normalize a phase price. */
export type PhaseRecurrence = {
  every: number;
  period: SubscriptionPeriod;
};

/**
 * Everything the subscription DTO needs to say about pricing over time:
 * the full timeline, which override (if any) is live right now, what comes
 * next, and the flattened "scheduled price change" shape the UI reads.
 */
export type PhaseProjection = {
  pricePhases: SubscriptionDto["pricePhases"];
  effectivePhaseKind: SubscriptionDto["effectivePhaseKind"];
  upcomingPhase: SubscriptionDto["upcomingPhase"];
  scheduledPriceChange: SubscriptionDto["scheduledPriceChange"];
};

const normalizeIsoOrEmpty = (value?: string | null): string => {
  if (!value) return "";
  return new Date(value).toISOString();
};

/** Converts one stored phase row into the DTO the client renders. */
export const toPricePhaseDto = (
  phase: PricePhaseInput,
  recurrence: PhaseRecurrence,
  preferredCurrency: string,
  rates: RateTable,
  now: Date,
): PricePhaseDto => {
  const cost = Number(phase.cost);
  const billing = SubscriptionCalculator.calculateBillingDetailsForPricing(
    {
      amount: Number.isFinite(cost) ? cost : 0,
      currency: phase.currency,
      every: recurrence.every,
      period: recurrence.period,
    },
    preferredCurrency,
    rates,
  );
  const startsAt = normalizeIsoOrEmpty(phase.startsAt);
  const endsAt = phase.endsAt ? normalizeIsoOrEmpty(phase.endsAt) : null;
  const startTime = Date.parse(startsAt);
  const endTime = endsAt ? Date.parse(endsAt) : null;
  const isActive =
    !Number.isNaN(startTime) &&
    startTime <= now.getTime() &&
    (endTime === null || endTime > now.getTime());

  return {
    id: phase.id,
    kind: phase.kind,
    cost: Number.isFinite(cost) ? cost : 0,
    currency: phase.currency,
    startsAt,
    endsAt,
    isActive,
    billing,
  };
};

/**
 * Assembles the pricing timeline.
 *
 * `effectivePhaseKind` reports `trial` or `intro` ONLY while such a window is
 * open; otherwise `standard`. A pending `scheduledChange` in the future does
 * not change what the user is paying today and must not colour this field.
 */
export const buildPhaseProjection = (
  recurrence: PhaseRecurrence,
  phases: readonly PricePhaseInput[],
  preferredCurrency: string,
  rates: RateTable,
  now: Date = new Date(),
): PhaseProjection => {
  const phaseDtos = phases
    .map((phase) =>
      toPricePhaseDto(phase, recurrence, preferredCurrency, rates, now),
    )
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));

  const activeOverride = phaseDtos.find(
    (p) => p.isActive && (p.kind === "trial" || p.kind === "intro"),
  );
  const upcoming = getUpcomingPhase(phaseDtos, now);
  const scheduledPriceChange = upcoming
    ? {
        cost: upcoming.cost,
        currency: upcoming.currency,
        effectiveAt: upcoming.startsAt,
        billing: upcoming.billing,
      }
    : null;

  return {
    pricePhases: phaseDtos,
    effectivePhaseKind: activeOverride?.kind ?? "standard",
    upcomingPhase: upcoming,
    scheduledPriceChange,
  };
};
