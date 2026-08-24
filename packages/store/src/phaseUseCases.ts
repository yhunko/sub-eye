import { getSubscriptionLifecycleStatus } from "@subeye/lifecycle";
import type {
  PricePhaseKind,
  SchedulePriceChangeInput,
  StartPhaseInput,
  SubscriptionDto,
} from "@subeye/model";
import {
  getEffectivePhase,
  normalizeAmount,
  normalizeIsoDate,
  resolveScheduledEffectiveAt,
  selectDuePhases,
  toStartOfUtcDay,
} from "@subeye/pricing";
import {
  CannotScheduleCancelledError,
  CustomDateRequiredError,
  InvalidScheduledDateError,
  PhaseAlreadyAppliedError,
  PhaseNotFoundError,
  ScheduledDateBeforeCancellationError,
  ScheduledDateMustBeFutureError,
  SubscriptionNotFoundError,
} from "./errors";
import { loadSubscriptionDto } from "./loadSubscriptionDto";
import type { Ports } from "./ports";
import type { PricePhaseRecord, SubscriptionRecord } from "./records";

/**
 * Put a price on the timeline. One entry point for all three shapes — the
 * three old routes (`/trial`, `/intro-discount`, `/phases/schedule-change`)
 * were three names for the same private schedule builders.
 *  - `trial` / `intro` set the override price on the row now, lay down the
 *    override phase (applied) plus the following `standard` revert phase;
 *  - `scheduledChange` replaces the standard price on a future date.
 */
export const startPhase = async (
  ports: Ports,
  id: string,
  payload: StartPhaseInput,
): Promise<SubscriptionDto> => {
  if (payload.kind === "scheduledChange") {
    return schedulePriceChange(ports, id, {
      mode: payload.mode,
      scheduledCost: payload.cost,
      scheduledCurrency: payload.currency,
      customDate: payload.customDate ?? null,
    });
  }

  return startPricingSchedule(ports, id, {
    overrideKind: payload.kind,
    overrideCost: payload.promoCost,
    overrideCurrency: payload.currency,
    endsAt: payload.endsAt,
    standardCost: payload.standardCost,
    standardCurrency: payload.currency,
  });
};

/** Schedule a one-off change of the standard price on a future date. */
export const schedulePriceChange = async (
  ports: Ports,
  id: string,
  payload: SchedulePriceChangeInput,
): Promise<SubscriptionDto> => {
  const existing = await requireSubscription(ports, id);
  const preferences = await ports.preferences.read();
  const now = ports.now();

  const effectiveAt = resolveScheduledEffectiveAt(
    existing,
    payload,
    now,
    preferences.preferredTimezone,
  );
  if (effectiveAt === null) throw new CustomDateRequiredError();
  assertPhaseWindow(existing, effectiveAt, now);

  await ports.phases.replacePending(id, [
    {
      id: ports.newId(),
      subscriptionId: id,
      kind: "scheduledChange",
      cost: normalizeAmount(payload.scheduledCost),
      currency: payload.scheduledCurrency ?? existing.currency,
      startsAt: effectiveAt,
      endsAt: null,
      appliedAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
  ]);

  return loadSubscriptionDto(ports, id);
};

/** Remove a pending phase (e.g. an upcoming scheduled change) before it fires. */
export const cancelPhase = async (
  ports: Ports,
  id: string,
  phaseId: string,
): Promise<SubscriptionDto> => {
  await requireSubscription(ports, id);

  const phase = (await ports.phases.bySubscription(id)).find(
    (candidate) => candidate.id === phaseId,
  );
  if (!phase) throw new PhaseNotFoundError();
  if (phase.appliedAt) throw new PhaseAlreadyAppliedError();

  await ports.phases.remove(phaseId);

  return loadSubscriptionDto(ports, id);
};

/** Apply a pending phase immediately (e.g. "end trial now", "apply now"). */
export const applyPhaseNow = async (
  ports: Ports,
  id: string,
  phaseId: string,
): Promise<SubscriptionDto> => {
  const existing = await requireSubscription(ports, id);

  const phase = (await ports.phases.bySubscription(id)).find(
    (candidate) => candidate.id === phaseId,
  );
  if (!phase) throw new PhaseNotFoundError();
  if (phase.appliedAt) throw new PhaseAlreadyAppliedError();

  await applyPhase(ports, existing, phase);

  return loadSubscriptionDto(ports, id);
};

/**
 * Apply every pending phase whose boundary is already due, in order. This is
 * the whole of the boundary machinery: there is no scheduler, so a phase fires
 * the next time `getSubscription` reads the subscription it belongs to.
 */
export const applyDuePhases = async (
  ports: Ports,
  subscriptionId: string,
): Promise<void> => {
  const now = ports.now();
  const due = selectDuePhases(
    await ports.phases.bySubscription(subscriptionId),
    now.getTime(),
  );

  for (const phase of due) {
    await applyPhaseByWorkflow(ports, subscriptionId, phase.id);
  }
};

/** Apply one specific phase. Idempotent — `appliedAt` is the anchor. */
export const applyPhaseByWorkflow = async (
  ports: Ports,
  subscriptionId: string,
  phaseId: string,
): Promise<void> => {
  const phase = (await ports.phases.bySubscription(subscriptionId)).find(
    (candidate) => candidate.id === phaseId,
  );
  if (!phase || phase.appliedAt) return;

  const subscription = await ports.subscriptions.byId(subscriptionId);
  if (!subscription) return;

  await applyPhase(ports, subscription, phase);
};

const startPricingSchedule = async (
  ports: Ports,
  id: string,
  args: {
    overrideKind: Extract<PricePhaseKind, "trial" | "intro">;
    overrideCost: number;
    overrideCurrency?: string;
    endsAt: string;
    standardCost: number;
    standardCurrency?: string;
  },
): Promise<SubscriptionDto> => {
  const existing = await requireSubscription(ports, id);
  const now = ports.now();

  const endsAt = toStartOfUtcDay(args.endsAt);
  assertPhaseWindow(existing, endsAt, now);

  const overrideCurrency = args.overrideCurrency ?? existing.currency;
  const standardCurrency = args.standardCurrency ?? existing.currency;
  const startsAt = now.toISOString();

  // The override price is what the user pays right now.
  await ports.subscriptions.update(id, {
    cost: normalizeAmount(args.overrideCost),
    currency: overrideCurrency,
  });

  // A trial/intro defines a fresh pricing schedule — replace any existing one.
  await ports.phases.replaceAll(id, [
    {
      id: ports.newId(),
      subscriptionId: id,
      kind: args.overrideKind,
      cost: normalizeAmount(args.overrideCost),
      currency: overrideCurrency,
      startsAt,
      endsAt,
      appliedAt: startsAt,
      createdAt: startsAt,
      updatedAt: startsAt,
    },
    {
      id: ports.newId(),
      subscriptionId: id,
      kind: "standard",
      cost: normalizeAmount(args.standardCost),
      currency: standardCurrency,
      startsAt: endsAt,
      endsAt: null,
      appliedAt: null,
      createdAt: startsAt,
      updatedAt: startsAt,
    },
  ]);

  return loadSubscriptionDto(ports, id);
};

const applyPhase = async (
  ports: Ports,
  subscription: SubscriptionRecord,
  phase: PricePhaseRecord,
): Promise<void> => {
  const appliedAtDate = ports.now();
  const appliedAt = appliedAtDate.toISOString();

  // The phase this one displaces: whichever sibling phase's window contains
  // the apply moment. Its endsAt must be closed here or getEffectivePhase
  // keeps returning the old price after an early "apply now".
  const siblings = (await ports.phases.bySubscription(subscription.id)).filter(
    (candidate) => candidate.id !== phase.id,
  );
  const preceding = getEffectivePhase(
    siblings.map((candidate) => ({
      id: candidate.id,
      startsAt: normalizeIsoDate(candidate.startsAt) ?? "",
      endsAt: normalizeIsoDate(candidate.endsAt),
    })),
    appliedAtDate,
  );

  // The applied phase's own window starts now — an early apply must not leave
  // a future startsAt behind for getUpcomingPhase to keep reporting.
  const phaseStartsAt = normalizeIsoDate(phase.startsAt);
  const startsAt =
    phaseStartsAt && Date.parse(phaseStartsAt) > appliedAtDate.getTime()
      ? appliedAt
      : (phaseStartsAt ?? appliedAt);

  await ports.phases.applyBoundary({
    subscriptionId: subscription.id,
    cost: normalizeAmount(Number(phase.cost)),
    currency: phase.currency,
    phaseId: phase.id,
    appliedAt,
    startsAt,
    precedingPhaseId: preceding?.id ?? null,
  });
};

const requireSubscription = async (
  ports: Ports,
  id: string,
): Promise<SubscriptionRecord> => {
  const existing = await ports.subscriptions.byId(id);
  if (!existing) throw new SubscriptionNotFoundError();
  return existing;
};

const assertPhaseWindow = (
  subscription: SubscriptionRecord,
  boundary: string,
  now: Date,
): void => {
  const willBeCancelledAt = normalizeIsoDate(subscription.willBeCancelledAt);
  const status = getSubscriptionLifecycleStatus({ willBeCancelledAt }, now);
  if (status === "cancelled") throw new CannotScheduleCancelledError();

  const boundaryTime = Date.parse(boundary);
  if (Number.isNaN(boundaryTime)) throw new InvalidScheduledDateError();
  // Against the start of the UTC day, not the instant — same backstop rule as
  // `futureIsoDateSchema`. A boundary is a calendar day, and `now` itself
  // rejected the tomorrow of anyone west of UTC after their early evening.
  const startOfUtcToday = new Date(now.getTime());
  startOfUtcToday.setUTCHours(0, 0, 0, 0);
  if (boundaryTime < startOfUtcToday.getTime()) {
    throw new ScheduledDateMustBeFutureError();
  }

  const cancellationTime = willBeCancelledAt
    ? Date.parse(willBeCancelledAt)
    : Number.NaN;
  if (!Number.isNaN(cancellationTime) && boundaryTime >= cancellationTime) {
    throw new ScheduledDateBeforeCancellationError();
  }
};
