import type {
  PricePhaseDto,
  PricePhaseKind,
  SubscriptionPeriod,
} from "@subeye/model";
import { buildBillingDetails, type RateTable } from "@subeye/money";
import { getEffectivePhase } from "./phaseSelection";

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

/** The full timeline and which override (if any) is live right now. */
export type PhaseProjection = {
  pricePhases: PricePhaseDto[];
  effectivePhaseKind: PricePhaseKind;
};

const normalizeIsoOrEmpty = (value?: string | null): string => {
  if (!value) return "";
  return new Date(value).toISOString();
};

/** Converts one stored phase row into the DTO the client renders. */
const toPricePhaseDto = (
  phase: PricePhaseInput,
  recurrence: PhaseRecurrence,
  preferredCurrency: string,
  rates: RateTable,
  now: Date,
): PricePhaseDto => {
  const cost = Number(phase.cost);
  const billing = buildBillingDetails(
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
 * `effectivePhaseKind` is the kind of whichever phase is effective right now —
 * `getEffectivePhase(phases, now)?.kind ?? "standard"` — so it can never
 * disagree with the per-phase `isActive` flag (both encode the same half-open
 * window). A pending `scheduledChange` sitting in the future is not effective
 * yet, so it stays `standard` until its window opens.
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

  return {
    pricePhases: phaseDtos,
    effectivePhaseKind: getEffectivePhase(phaseDtos, now)?.kind ?? "standard",
  };
};
