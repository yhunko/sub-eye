import {
  buildPhaseProjection,
  getEffectivePhase,
  normalizeAmount,
  normalizeIsoDate,
  resolveScheduledEffectiveAt,
  selectDuePhases,
  toStartOfDayInTimezone,
} from "@subeye/pricing";
import type {
  PricePhaseKind,
  SchedulePriceChangeInput,
  StartPhaseInput,
  SubscriptionDto,
  UserPreferences,
} from "@subeye/shared";
import { getSubscriptionLifecycleStatus } from "@subeye/shared";
import { SubscriptionCalculator } from "@subeye/spend";
import { CurrencyService } from "../currency/currencyService";
import { UserService } from "../user/userService";
import {
  CannotScheduleCancelledError,
  CustomDateRequiredError,
  InvalidScheduledDateError,
  PhaseAlreadyAppliedError,
  PhaseNotFoundError,
  ScheduledDateBeforeCancellationError,
  ScheduledDateMustBeFutureError,
  SubscriptionNotFoundError,
} from "./subscriptionErrors";
import type { EmbeddedCategory } from "./subscriptionMapper";
import { SubscriptionMapper } from "./subscriptionMapper";
import type {
  PricePhaseRecord,
  SubscriptionPricePhaseRepository,
} from "./subscriptionPricePhaseRepository";
import { SubscriptionPricePhaseRepository as PhaseRepository } from "./subscriptionPricePhaseRepository";
import type { SubscriptionRecord } from "./subscriptionRepository";
import { SubscriptionRepository } from "./subscriptionRepository";

export type SubscriptionPhaseServiceDeps = {
  repository: typeof SubscriptionRepository;
  phaseRepository: typeof SubscriptionPricePhaseRepository;
  currencyService: typeof CurrencyService;
  userService: typeof UserService;
};

const defaultDeps: SubscriptionPhaseServiceDeps = {
  repository: SubscriptionRepository,
  phaseRepository: PhaseRepository,
  currencyService: CurrencyService,
  userService: UserService,
};

export class SubscriptionPhaseService {
  /**
   * Put a price on the timeline. One entry point for all three shapes — the
   * three old routes (`/trial`, `/intro-discount`, `/phases/schedule-change`)
   * were three names for the same private schedule builders.
   *  - `trial` / `intro` set the override price on the row now, lay down the
   *    override phase (applied) plus the following `standard` revert phase;
   *  - `scheduledChange` replaces the standard price on a future date.
   */
  static async startPhase(
    id: string,
    userId: string,
    payload: StartPhaseInput,
    deps: SubscriptionPhaseServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto> {
    if (payload.kind === "scheduledChange") {
      return SubscriptionPhaseService.schedulePriceChange(
        id,
        userId,
        {
          mode: payload.mode,
          scheduledCost: payload.cost,
          scheduledCurrency: payload.currency,
          customDate: payload.customDate ?? null,
        },
        deps,
      );
    }

    return SubscriptionPhaseService.startPricingSchedule(
      id,
      userId,
      {
        overrideKind: payload.kind,
        overrideCost: payload.promoCost,
        overrideCurrency: payload.currency,
        endsAt: payload.endsAt,
        standardCost: payload.standardCost,
        standardCurrency: payload.currency,
        changeType: payload.kind === "trial" ? "trialStarted" : "introAdded",
      },
      deps,
    );
  }

  /** Schedule a one-off change of the standard price on a future date. */
  static async schedulePriceChange(
    id: string,
    userId: string,
    payload: SchedulePriceChangeInput,
    deps: SubscriptionPhaseServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto> {
    const existing = await SubscriptionPhaseService.requireSubscription(
      id,
      userId,
      deps,
    );

    const { preferences } =
      await SubscriptionPhaseService.getPreferencesAndRates(userId, deps);
    const effectiveAt = resolveScheduledEffectiveAt(
      existing,
      payload,
      preferences.preferredTimezone,
    );
    if (effectiveAt === null) throw new CustomDateRequiredError();
    SubscriptionPhaseService.assertPhaseWindow(existing, effectiveAt);

    const scheduledCurrency = payload.scheduledCurrency ?? existing.currency;

    await SubscriptionPhaseService.clearPendingPhases(id, deps);

    await deps.phaseRepository.insertMany([
      {
        subscriptionId: id,
        userId: existing.userId,
        kind: "scheduledChange",
        cost: normalizeAmount(payload.scheduledCost),
        currency: scheduledCurrency,
        startsAt: effectiveAt,
        endsAt: null,
        appliedAt: null,
      },
    ]);

    return SubscriptionPhaseService.reloadDto(id, userId, deps);
  }

  /** Remove a pending phase (e.g. an upcoming scheduled change) before it fires. */
  static async cancelPhase(
    id: string,
    userId: string,
    phaseId: string,
    deps: SubscriptionPhaseServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto> {
    // Ownership check — throws if the subscription is not this user's.
    await SubscriptionPhaseService.requireSubscription(id, userId, deps);

    const phase = await deps.phaseRepository.findById(phaseId);
    if (!phase || phase.subscriptionId !== id) {
      throw new PhaseNotFoundError();
    }
    if (phase.appliedAt) {
      throw new PhaseAlreadyAppliedError();
    }

    await deps.phaseRepository.deleteById(phaseId);

    return SubscriptionPhaseService.reloadDto(id, userId, deps);
  }

  /** Apply a pending phase immediately (e.g. "end trial now", "apply now"). */
  static async applyPhaseNow(
    id: string,
    userId: string,
    phaseId: string,
    deps: SubscriptionPhaseServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto> {
    const existing = await SubscriptionPhaseService.requireSubscription(
      id,
      userId,
      deps,
    );
    const phase = await deps.phaseRepository.findById(phaseId);
    if (!phase || phase.subscriptionId !== id) {
      throw new PhaseNotFoundError();
    }
    if (phase.appliedAt) {
      throw new PhaseAlreadyAppliedError();
    }

    await SubscriptionPhaseService.applyPhase(existing, phase, deps);

    const { preferences, rates } =
      await SubscriptionPhaseService.getPreferencesAndRates(userId, deps);
    return SubscriptionPhaseService.reloadDto(id, userId, deps, {
      preferences,
      rates,
    });
  }

  /** Apply a specific phase (called by the boundary workflow). Idempotent. */
  static async applyPhaseByWorkflow(
    payload: { subscriptionId: string; phaseId: string },
    deps: SubscriptionPhaseServiceDeps = defaultDeps,
  ): Promise<void> {
    const phase = await deps.phaseRepository.findById(payload.phaseId);
    if (!phase || phase.appliedAt) return;
    const subscription = await deps.repository.findById(payload.subscriptionId);
    if (!subscription) return;
    await SubscriptionPhaseService.applyPhase(subscription, phase, deps);
  }

  /**
   * Apply every pending phase whose boundary is already due, in order. Used by
   * lazy reconciliation and by the legacy price-change workflow bridge.
   */
  static async applyDuePhases(
    subscriptionId: string,
    deps: SubscriptionPhaseServiceDeps = defaultDeps,
  ): Promise<void> {
    const pending =
      await deps.phaseRepository.findPendingBySubscriptionId(subscriptionId);
    const due = selectDuePhases(pending, Date.now());

    for (const phase of due) {
      await SubscriptionPhaseService.applyPhaseByWorkflow(
        { subscriptionId, phaseId: phase.id },
        deps,
      );
    }
  }

  /**
   * Load the phase rows for a set of subscriptions, grouped by subscription id.
   * Pure read — no writes, no external calls. This is what the list and detail
   * reads use in place of the old reconciler.
   */
  static async loadPhasesFor(
    ids: string[],
    deps: SubscriptionPhaseServiceDeps = defaultDeps,
  ): Promise<Map<string, PricePhaseRecord[]>> {
    const byId = new Map<string, PricePhaseRecord[]>();
    if (ids.length === 0) return byId;

    for (const phase of await deps.phaseRepository.findBySubscriptionIds(ids)) {
      const list = byId.get(phase.subscriptionId) ?? [];
      list.push(phase);
      byId.set(phase.subscriptionId, list);
    }
    return byId;
  }

  /** Cancel + delete all pending phases for a subscription (cancel/edit paths). */
  static async clearPendingPhases(
    subscriptionId: string,
    deps: SubscriptionPhaseServiceDeps = defaultDeps,
  ): Promise<void> {
    await deps.phaseRepository.deletePendingBySubscriptionId(subscriptionId);
  }

  private static async startPricingSchedule(
    id: string,
    userId: string,
    args: {
      overrideKind: Extract<PricePhaseKind, "trial" | "intro">;
      overrideCost: number;
      overrideCurrency?: string;
      endsAt: string;
      standardCost: number;
      standardCurrency?: string;
      changeType: string;
    },
    deps: SubscriptionPhaseServiceDeps,
  ): Promise<SubscriptionDto> {
    const existing = await SubscriptionPhaseService.requireSubscription(
      id,
      userId,
      deps,
    );

    const { preferences } =
      await SubscriptionPhaseService.getPreferencesAndRates(userId, deps);

    const endsAt = toStartOfDayInTimezone(
      args.endsAt,
      preferences.preferredTimezone,
    );
    SubscriptionPhaseService.assertPhaseWindow(existing, endsAt);

    const overrideCurrency = args.overrideCurrency ?? existing.currency;
    const standardCurrency = args.standardCurrency ?? existing.currency;
    const startsAt = new Date().toISOString();

    // A trial/intro defines a fresh pricing schedule — replace any existing one.
    await SubscriptionPhaseService.clearPendingPhases(id, deps);
    await deps.phaseRepository.deleteAllBySubscriptionId(id);

    // The override price is what the user pays right now.
    await deps.repository.update(id, {
      cost: normalizeAmount(args.overrideCost),
      currency: overrideCurrency,
    });

    await deps.phaseRepository.insertMany([
      {
        subscriptionId: id,
        userId: existing.userId,
        kind: args.overrideKind,
        cost: normalizeAmount(args.overrideCost),
        currency: overrideCurrency,
        startsAt,
        endsAt,
        appliedAt: startsAt,
      },
      {
        subscriptionId: id,
        userId: existing.userId,
        kind: "standard",
        cost: normalizeAmount(args.standardCost),
        currency: standardCurrency,
        startsAt: endsAt,
        endsAt: null,
        appliedAt: null,
      },
    ]);

    return SubscriptionPhaseService.reloadDto(id, userId, deps);
  }

  private static async applyPhase(
    subscription: SubscriptionRecord,
    phase: PricePhaseRecord,
    deps: SubscriptionPhaseServiceDeps,
  ): Promise<void> {
    const appliedAt = new Date().toISOString();
    const appliedAtDate = new Date(appliedAt);

    // The phase this one displaces: whichever sibling phase's window contains
    // the apply moment. Its endsAt must be closed here or getEffectivePhase
    // keeps returning the old price after an early "apply now".
    const siblings = (
      await deps.phaseRepository.findBySubscriptionId(subscription.id)
    ).filter((candidate) => candidate.id !== phase.id);
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

    await deps.phaseRepository.applyBoundaryBatch({
      subscriptionId: subscription.id,
      cost: normalizeAmount(Number(phase.cost)),
      currency: phase.currency,
      phaseId: phase.id,
      appliedAt,
      startsAt,
      precedingPhaseId: preceding?.id ?? null,
    });
  }

  private static async requireSubscription(
    id: string,
    userId: string,
    deps: SubscriptionPhaseServiceDeps,
  ): Promise<SubscriptionRecord> {
    const existing = await deps.repository.findById(id);
    if (!existing || existing.userId !== userId) {
      throw new SubscriptionNotFoundError();
    }
    return existing;
  }

  private static mapToDto(
    subscription: SubscriptionRecord,
    phases: PricePhaseRecord[],
    preferences: UserPreferences,
    rates: Record<string, number>,
    category: EmbeddedCategory | null = null,
  ): SubscriptionDto {
    const billing = SubscriptionCalculator.calculateBillingDetails(
      subscription,
      preferences.preferredCurrency,
      rates,
    );
    const { nextPaymentDate, lastPaymentDate } =
      SubscriptionCalculator.calculatePaymentDates(
        subscription,
        preferences.preferredTimezone,
      );
    const projection = buildPhaseProjection(
      { every: subscription.every, period: subscription.period },
      phases,
      preferences.preferredCurrency,
      rates,
    );
    return SubscriptionMapper.toDto(
      subscription,
      billing,
      nextPaymentDate,
      lastPaymentDate,
      projection,
      category,
    );
  }

  private static async reloadDto(
    id: string,
    userId: string,
    deps: SubscriptionPhaseServiceDeps,
    prefetched?: {
      preferences: UserPreferences;
      rates: Record<string, number>;
    },
  ): Promise<SubscriptionDto> {
    const { preferences, rates } =
      prefetched ??
      (await SubscriptionPhaseService.getPreferencesAndRates(userId, deps));
    const subscription = await deps.repository.findById(id);
    if (!subscription) {
      throw new SubscriptionNotFoundError();
    }
    const phases = await deps.phaseRepository.findBySubscriptionId(id);
    return SubscriptionPhaseService.mapToDto(
      subscription,
      phases,
      preferences,
      rates,
    );
  }

  private static async getPreferencesAndRates(
    userId: string,
    deps: SubscriptionPhaseServiceDeps,
  ): Promise<{ preferences: UserPreferences; rates: Record<string, number> }> {
    const preferences = await deps.userService.getUserPreferences(userId);
    const rates = await deps.currencyService.getRates(
      preferences.preferredCurrency,
    );
    return { preferences, rates };
  }

  private static assertPhaseWindow(
    subscription: SubscriptionRecord,
    boundary: string,
  ): void {
    const willBeCancelledAt = normalizeIsoDate(subscription.willBeCancelledAt);
    const status = getSubscriptionLifecycleStatus({ willBeCancelledAt });
    if (status === "cancelled") throw new CannotScheduleCancelledError();

    const boundaryTime = Date.parse(boundary);
    if (Number.isNaN(boundaryTime)) throw new InvalidScheduledDateError();
    if (boundaryTime <= Date.now()) throw new ScheduledDateMustBeFutureError();

    const cancellationTime = willBeCancelledAt
      ? Date.parse(willBeCancelledAt)
      : Number.NaN;
    if (!Number.isNaN(cancellationTime) && boundaryTime >= cancellationTime) {
      throw new ScheduledDateBeforeCancellationError();
    }
  }
}
