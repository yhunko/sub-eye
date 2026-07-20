import { buildPhaseProjection, getUpcomingPhase } from "@subeye/pricing";
import type {
  AddIntroDiscountInput,
  PricePhaseDto,
  PricePhaseKind,
  SchedulePriceChangeInput,
  StartTrialInput,
  SubscriptionAction,
  SubscriptionDto,
  UserPreferences,
} from "@subeye/shared";
import {
  DateTimezoneUtils,
  getSubscriptionLifecycleStatus,
  RecurrenceUtils,
} from "@subeye/shared";
import { SubscriptionCalculator } from "@subeye/spend";
import { isSameDay } from "date-fns";
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
import { SubscriptionHistoryService } from "./subscriptionHistoryService";
import type { SubscriptionPhaseProjection } from "./subscriptionMapper";
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
  historyService: typeof SubscriptionHistoryService;
};

type HistoryChange = Record<string, unknown>;

const defaultDeps: SubscriptionPhaseServiceDeps = {
  repository: SubscriptionRepository,
  phaseRepository: PhaseRepository,
  currencyService: CurrencyService,
  userService: UserService,
  historyService: SubscriptionHistoryService,
};

export class SubscriptionPhaseService {
  /**
   * Start a free (or reduced) trial: set the trial price on the row now, lay
   * down a `trial` phase (active) plus the following `standard` phase that the
   * boundary workflow applies when the trial ends.
   */
  static async startTrial(
    id: string,
    userId: string,
    payload: StartTrialInput,
    deps: SubscriptionPhaseServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto> {
    return SubscriptionPhaseService.startPricingSchedule(
      id,
      userId,
      {
        overrideKind: "trial",
        overrideCost: payload.trialCost,
        overrideCurrency: payload.trialCurrency,
        endsAt: payload.endsAt,
        standardCost: payload.standardCost,
        standardCurrency: payload.standardCurrency,
        changeType: "trialStarted",
      },
      deps,
    );
  }

  /** Add a time-limited intro discount that reverts to the standard price. */
  static async addIntroDiscount(
    id: string,
    userId: string,
    payload: AddIntroDiscountInput,
    deps: SubscriptionPhaseServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto> {
    return SubscriptionPhaseService.startPricingSchedule(
      id,
      userId,
      {
        overrideKind: "intro",
        overrideCost: payload.introCost,
        overrideCurrency: payload.introCurrency,
        endsAt: payload.endsAt,
        standardCost: payload.standardCost,
        standardCurrency: payload.standardCurrency,
        changeType: "introAdded",
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

    const { preferences, rates } =
      await SubscriptionPhaseService.getPreferencesAndRates(userId, deps);
    const beforeDto = await SubscriptionPhaseService.toCurrentDto(
      existing,
      preferences,
      rates,
      deps,
    );

    const effectiveAt = SubscriptionPhaseService.resolveScheduledEffectiveAt(
      existing,
      payload,
      preferences.preferredTimezone,
    );
    SubscriptionPhaseService.assertPhaseWindow(existing, effectiveAt);

    const scheduledCurrency = payload.scheduledCurrency ?? existing.currency;

    await SubscriptionPhaseService.clearPendingPhases(id, deps);

    await deps.phaseRepository.insertMany([
      {
        subscriptionId: id,
        userId: existing.userId,
        orgId: existing.orgId,
        kind: "scheduledChange",
        cost: SubscriptionPhaseService.normalizeAmount(payload.scheduledCost),
        currency: scheduledCurrency,
        startsAt: effectiveAt,
        endsAt: null,
        appliedAt: null,
      },
    ]);

    return SubscriptionPhaseService.reloadDto(id, userId, deps, {
      before: beforeDto,
      change: { type: "priceChangeScheduled", mode: payload.mode },
    });
  }

  /** Remove a pending phase (e.g. an upcoming scheduled change) before it fires. */
  static async cancelPhase(
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

    const { preferences, rates } =
      await SubscriptionPhaseService.getPreferencesAndRates(userId, deps);
    const beforeDto = await SubscriptionPhaseService.toCurrentDto(
      existing,
      preferences,
      rates,
      deps,
    );

    await deps.phaseRepository.deleteById(phaseId);

    return SubscriptionPhaseService.reloadDto(id, userId, deps, {
      before: beforeDto,
      change: { type: "phaseCancelled", phaseId, kind: phase.kind },
    });
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
    return SubscriptionPhaseService.reloadDto(id, userId, deps, null, {
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
    const now = Date.now();
    const due = pending
      .filter((p) => Date.parse(p.startsAt) <= now)
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));

    for (const phase of due) {
      await SubscriptionPhaseService.applyPhaseByWorkflow(
        { subscriptionId, phaseId: phase.id },
        deps,
      );
    }
  }

  /**
   * Lazy reconciliation: apply due phases and (re)schedule any pending future
   * boundary missing a workflow. Returns refreshed records plus their phases so
   * callers can map DTOs without re-querying.
   */
  static async reconcilePhases(
    subscriptions: SubscriptionRecord[],
    deps: SubscriptionPhaseServiceDeps = defaultDeps,
  ): Promise<{
    subscriptions: SubscriptionRecord[];
    phasesBySubscriptionId: Map<string, PricePhaseRecord[]>;
  }> {
    const ids = subscriptions.map((s) => s.id);
    const allPhases = await deps.phaseRepository.findBySubscriptionIds(ids);
    const byId = new Map<string, PricePhaseRecord[]>();
    for (const phase of allPhases) {
      const list = byId.get(phase.subscriptionId) ?? [];
      list.push(phase);
      byId.set(phase.subscriptionId, list);
    }

    const now = Date.now();
    const refreshed: SubscriptionRecord[] = [];
    const phasesBySubscriptionId = new Map<string, PricePhaseRecord[]>();

    for (const subscription of subscriptions) {
      let phases = byId.get(subscription.id) ?? [];
      let currentSub = subscription;

      const due = phases.filter(
        (p) => !p.appliedAt && Date.parse(p.startsAt) <= now,
      );
      if (due.length > 0) {
        await SubscriptionPhaseService.applyDuePhases(subscription.id, deps);
        currentSub =
          (await deps.repository.findById(subscription.id)) ?? subscription;
        phases = await deps.phaseRepository.findBySubscriptionId(
          subscription.id,
        );
      }

      refreshed.push(currentSub);
      phasesBySubscriptionId.set(subscription.id, phases);
    }

    return { subscriptions: refreshed, phasesBySubscriptionId };
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

    const { preferences, rates } =
      await SubscriptionPhaseService.getPreferencesAndRates(userId, deps);
    const beforeDto = await SubscriptionPhaseService.toCurrentDto(
      existing,
      preferences,
      rates,
      deps,
    );

    const endsAt = SubscriptionPhaseService.toStartOfDayInTimezone(
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
      cost: SubscriptionPhaseService.normalizeAmount(args.overrideCost),
      currency: overrideCurrency,
    });

    await deps.phaseRepository.insertMany([
      {
        subscriptionId: id,
        userId: existing.userId,
        orgId: existing.orgId,
        kind: args.overrideKind,
        cost: SubscriptionPhaseService.normalizeAmount(args.overrideCost),
        currency: overrideCurrency,
        startsAt,
        endsAt,
        appliedAt: startsAt,
      },
      {
        subscriptionId: id,
        userId: existing.userId,
        orgId: existing.orgId,
        kind: "standard",
        cost: SubscriptionPhaseService.normalizeAmount(args.standardCost),
        currency: standardCurrency,
        startsAt: endsAt,
        endsAt: null,
        appliedAt: null,
      },
    ]);

    return SubscriptionPhaseService.reloadDto(id, userId, deps, {
      before: beforeDto,
      change: { type: args.changeType },
    });
  }

  private static async applyPhase(
    subscription: SubscriptionRecord,
    phase: PricePhaseRecord,
    deps: SubscriptionPhaseServiceDeps,
  ): Promise<void> {
    const { preferences, rates } =
      await SubscriptionPhaseService.getPreferencesAndRates(
        subscription.userId,
        deps,
      );
    const beforeDto = await SubscriptionPhaseService.toCurrentDto(
      subscription,
      preferences,
      rates,
      deps,
    );

    const appliedAt = new Date().toISOString();
    await deps.phaseRepository.applyBoundaryBatch({
      subscriptionId: subscription.id,
      cost: SubscriptionPhaseService.normalizeAmount(Number(phase.cost)),
      currency: phase.currency,
      phaseId: phase.id,
      appliedAt,
    });

    const updatedSub = await deps.repository.findById(subscription.id);
    const afterDto = await SubscriptionPhaseService.toCurrentDto(
      updatedSub ?? subscription,
      preferences,
      rates,
      deps,
    );

    await SubscriptionPhaseService.logHistoryAction(
      {
        subscriptionId: subscription.id,
        userId: subscription.userId,
        orgId: subscription.orgId,
        action: "updated",
        snapshot: {
          before: beforeDto,
          after: afterDto,
          change: { type: "phaseApplied", phaseId: phase.id, kind: phase.kind },
        },
      },
      deps,
    );
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

  private static async toCurrentDto(
    subscription: SubscriptionRecord,
    preferences: UserPreferences,
    rates: Record<string, number>,
    deps: SubscriptionPhaseServiceDeps,
  ): Promise<SubscriptionDto> {
    const phases = await deps.phaseRepository.findBySubscriptionId(
      subscription.id,
    );
    return SubscriptionPhaseService.mapToDto(
      subscription,
      phases,
      preferences,
      rates,
    );
  }

  private static mapToDto(
    subscription: SubscriptionRecord,
    phases: PricePhaseRecord[],
    preferences: UserPreferences,
    rates: Record<string, number>,
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
    );
  }

  private static async reloadDto(
    id: string,
    userId: string,
    deps: SubscriptionPhaseServiceDeps,
    history: { before: SubscriptionDto; change: HistoryChange } | null,
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
    const dto = SubscriptionPhaseService.mapToDto(
      subscription,
      phases,
      preferences,
      rates,
    );

    if (history) {
      await SubscriptionPhaseService.logHistoryAction(
        {
          subscriptionId: dto.id,
          userId,
          orgId: subscription.orgId,
          action: "updated",
          snapshot: {
            before: history.before,
            after: dto,
            change: history.change,
          },
        },
        deps,
      );
    }

    return dto;
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

  private static async logHistoryAction(
    {
      subscriptionId,
      userId,
      orgId,
      action,
      snapshot,
    }: {
      subscriptionId: string | null;
      userId: string;
      orgId: string | null | undefined;
      action: SubscriptionAction;
      snapshot: unknown;
    },
    deps: SubscriptionPhaseServiceDeps,
  ): Promise<void> {
    try {
      await deps.historyService.logAction(
        subscriptionId,
        userId,
        action,
        snapshot,
        orgId ?? null,
      );
    } catch (error) {
      console.error("Failed to log subscription history", {
        subscriptionId,
        userId,
        action,
        error,
      });
      if (process.env.NODE_ENV !== "production") throw error;
    }
  }

  private static resolveScheduledEffectiveAt(
    subscription: SubscriptionRecord,
    payload: SchedulePriceChangeInput,
    timezone?: string,
  ): string {
    if (payload.mode === "nextOccurrence") {
      return SubscriptionPhaseService.resolveNextOccurrenceEffectiveAt(
        subscription,
        timezone,
      );
    }
    if (!payload.customDate) throw new CustomDateRequiredError();

    const customEffectiveAt = SubscriptionPhaseService.toStartOfDayInTimezone(
      payload.customDate,
      timezone,
    );
    const nextOccurrenceEffectiveAt =
      SubscriptionPhaseService.resolveNextOccurrenceEffectiveAt(
        subscription,
        timezone,
      );
    if (
      SubscriptionPhaseService.isSameCalendarDayInTimezone(
        customEffectiveAt,
        nextOccurrenceEffectiveAt,
        timezone,
      )
    ) {
      return nextOccurrenceEffectiveAt;
    }
    return customEffectiveAt;
  }

  private static resolveNextOccurrenceEffectiveAt(
    subscription: SubscriptionRecord,
    timezone?: string,
  ): string {
    const { nextPaymentDate } = SubscriptionCalculator.calculatePaymentDates(
      subscription,
      timezone,
    );
    if (Date.parse(nextPaymentDate) > Date.now()) return nextPaymentDate;

    const nextOccurrence = RecurrenceUtils.addPeriod(
      DateTimezoneUtils.toZoned(nextPaymentDate, timezone),
      subscription.every,
      subscription.period,
      {
        anchorDate: DateTimezoneUtils.toZoned(
          subscription.paymentDate,
          timezone,
        ),
      },
    );
    return nextOccurrence.toISOString();
  }

  private static toStartOfDayInTimezone(
    date: string,
    timezone?: string,
  ): string {
    const zoned = DateTimezoneUtils.toZoned(date, timezone);
    zoned.setHours(0, 0, 0, 0);
    return zoned.toISOString();
  }

  private static isSameCalendarDayInTimezone(
    left: string | Date,
    right: string | Date,
    timezone?: string,
  ): boolean {
    return isSameDay(
      DateTimezoneUtils.toZoned(left, timezone),
      DateTimezoneUtils.toZoned(right, timezone),
    );
  }

  private static assertPhaseWindow(
    subscription: SubscriptionRecord,
    boundary: string,
  ): void {
    const willBeCancelledAt = SubscriptionPhaseService.normalizeDate(
      subscription.willBeCancelledAt,
    );
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

  private static normalizeDate(value?: string | Date | null): string | null {
    if (!value) return null;
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }

  private static normalizeAmount(value: number): string {
    return value.toFixed(2);
  }
}
