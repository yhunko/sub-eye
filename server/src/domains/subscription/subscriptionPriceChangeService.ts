import { isSameDay } from "date-fns";
import type { SchedulePriceChangeInput, SubscriptionDto } from "shared";
import {
  DateTimezoneUtils,
  getSubscriptionLifecycleStatus,
  RecurrenceUtils,
} from "shared";
import { db } from "../../db";
import { SubscriptionCalculator } from "./subscriptionCalculator";
import {
  CannotScheduleCancelledError,
  CustomDateRequiredError,
  InvalidScheduledDateError,
  NoScheduledPriceChangeError,
  ScheduledDateBeforeCancellationError,
  ScheduledDateMustBeFutureError,
} from "./subscriptionErrors";
import type { SubscriptionRecord } from "./subscriptionRepository";
import {
  defaultDeps,
  SubscriptionService,
  type SubscriptionServiceDeps,
} from "./subscriptionService";

export class SubscriptionPriceChangeService {
  static async schedulePriceChange(
    id: string,
    userId: string,
    payload: SchedulePriceChangeInput,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto> {
    const existing = await deps.repository.findById(db, id);

    if (!existing || existing.userId !== userId) {
      throw new Error("Subscription not found");
    }

    const { preferences, rates } =
      await SubscriptionService.getPreferencesAndRates(userId, deps);
    const previousDto = SubscriptionService.mapToDto(
      existing,
      preferences,
      rates,
    );

    const effectiveAt =
      SubscriptionPriceChangeService.resolveScheduledEffectiveAt(
        existing,
        payload,
        preferences.preferredTimezone,
      );

    SubscriptionPriceChangeService.assertCanSchedulePriceChange(
      existing,
      effectiveAt,
    );

    if (existing.priceChangeQstashMessageId) {
      await SubscriptionPriceChangeService.tryCancelPriceChangeWorkflow(
        existing.priceChangeQstashMessageId,
        deps,
      );
    }

    const scheduledCurrency = payload.scheduledCurrency ?? existing.currency;

    const workflowPayload = {
      subscriptionId: existing.id,
      effectiveAt,
      scheduledCost: payload.scheduledCost,
      scheduledCurrency,
    };
    const workflowRunId =
      await SubscriptionPriceChangeService.trySchedulePriceChangeWorkflow(
        workflowPayload,
        deps,
      );

    let updated: SubscriptionRecord;

    try {
      updated = await deps.repository.update(db, id, {
        scheduledCost: payload.scheduledCost.toString(),
        scheduledCurrency,
        scheduledEffectiveAt: effectiveAt,
        priceChangeQstashMessageId: workflowRunId,
      });
    } catch (error) {
      if (workflowRunId) {
        await SubscriptionPriceChangeService.tryCancelPriceChangeWorkflow(
          workflowRunId,
          deps,
        );
      }
      throw error;
    }

    const dto = SubscriptionService.mapToDto(updated, preferences, rates);

    await SubscriptionService.logHistoryAction(
      {
        subscriptionId: dto.id,
        userId,
        orgId: existing.orgId,
        action: "updated",
        snapshot: {
          before: previousDto,
          after: dto,
        },
      },
      deps,
    );

    return dto;
  }

  static async cancelScheduledPriceChange(
    id: string,
    userId: string,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto> {
    const existing = await deps.repository.findById(db, id);

    if (!existing || existing.userId !== userId) {
      throw new Error("Subscription not found");
    }

    if (!SubscriptionPriceChangeService.hasScheduledPriceChange(existing)) {
      throw new NoScheduledPriceChangeError();
    }

    const { preferences, rates } =
      await SubscriptionService.getPreferencesAndRates(userId, deps);
    const previousDto = SubscriptionService.mapToDto(
      existing,
      preferences,
      rates,
    );

    if (existing.priceChangeQstashMessageId) {
      await SubscriptionPriceChangeService.tryCancelPriceChangeWorkflow(
        existing.priceChangeQstashMessageId,
        deps,
      );
    }

    const updated = await deps.repository.update(db, id, {
      scheduledCost: null,
      scheduledCurrency: null,
      scheduledEffectiveAt: null,
      priceChangeQstashMessageId: null,
    });

    const dto = SubscriptionService.mapToDto(updated, preferences, rates);

    await SubscriptionService.logHistoryAction(
      {
        subscriptionId: dto.id,
        userId,
        orgId: existing.orgId,
        action: "updated",
        snapshot: {
          before: previousDto,
          after: dto,
        },
      },
      deps,
    );

    return dto;
  }

  static async applyScheduledPriceChangeNow(
    id: string,
    userId: string,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto> {
    const existing = await deps.repository.findById(db, id);

    if (!existing || existing.userId !== userId) {
      throw new Error("Subscription not found");
    }

    if (!SubscriptionPriceChangeService.hasScheduledPriceChange(existing)) {
      throw new NoScheduledPriceChangeError();
    }

    if (existing.priceChangeQstashMessageId) {
      await SubscriptionPriceChangeService.tryCancelPriceChangeWorkflow(
        existing.priceChangeQstashMessageId,
        deps,
      );
    }

    const { preferences, rates } =
      await SubscriptionService.getPreferencesAndRates(userId, deps);
    const previousDto = SubscriptionService.mapToDto(
      existing,
      preferences,
      rates,
    );

    const updated = await deps.repository.update(db, id, {
      cost: existing.scheduledCost ?? existing.cost,
      currency: existing.scheduledCurrency ?? existing.currency,
      scheduledCost: null,
      scheduledCurrency: null,
      scheduledEffectiveAt: null,
      priceChangeQstashMessageId: null,
    });

    const dto = SubscriptionService.mapToDto(updated, preferences, rates);

    await SubscriptionService.logHistoryAction(
      {
        subscriptionId: dto.id,
        userId,
        orgId: existing.orgId,
        action: "updated",
        snapshot: {
          before: previousDto,
          after: dto,
        },
      },
      deps,
    );

    return dto;
  }

  static async applyScheduledPriceChangeByWorkflow(
    payload: {
      subscriptionId: string;
      effectiveAt: string;
      scheduledCost: number;
      scheduledCurrency: string;
    },
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<void> {
    const existing = await deps.repository.findById(db, payload.subscriptionId);

    if (!existing) {
      return;
    }

    if (
      !SubscriptionPriceChangeService.valuesMatchScheduledPriceChange(
        existing,
        payload,
      )
    ) {
      return;
    }

    const { preferences, rates } =
      await SubscriptionService.getPreferencesAndRates(existing.userId, deps);
    const previousDto = SubscriptionService.mapToDto(
      existing,
      preferences,
      rates,
    );

    const updated = await deps.repository.update(db, existing.id, {
      cost: existing.scheduledCost ?? existing.cost,
      currency: existing.scheduledCurrency ?? existing.currency,
      scheduledCost: null,
      scheduledCurrency: null,
      scheduledEffectiveAt: null,
      priceChangeQstashMessageId: null,
    });

    const dto = SubscriptionService.mapToDto(updated, preferences, rates);

    await SubscriptionService.logHistoryAction(
      {
        subscriptionId: dto.id,
        userId: existing.userId,
        orgId: existing.orgId,
        action: "updated",
        snapshot: {
          before: previousDto,
          after: dto,
        },
      },
      deps,
    );
  }

  static async reconcileScheduledPriceChanges(
    subscriptions: SubscriptionRecord[],
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<SubscriptionRecord[]> {
    return await Promise.all(
      subscriptions.map(async (subscription) => {
        if (
          !SubscriptionPriceChangeService.hasScheduledPriceChange(subscription)
        ) {
          return subscription;
        }

        const effectiveAt = SubscriptionService.normalizeDate(
          subscription.scheduledEffectiveAt,
        );
        const scheduledCurrency = subscription.scheduledCurrency;
        const scheduledCostRaw = subscription.scheduledCost;

        if (!effectiveAt || !scheduledCurrency || !scheduledCostRaw) {
          return subscription;
        }

        const scheduledCost = Number(scheduledCostRaw);
        if (!Number.isFinite(scheduledCost)) {
          return subscription;
        }

        const due = Date.parse(effectiveAt) <= Date.now();

        if (due) {
          await SubscriptionPriceChangeService.applyScheduledPriceChangeByWorkflow(
            {
              subscriptionId: subscription.id,
              effectiveAt,
              scheduledCost,
              scheduledCurrency,
            },
            deps,
          );

          const refreshed = await deps.repository.findById(db, subscription.id);
          return refreshed ?? subscription;
        }

        if (!subscription.priceChangeQstashMessageId) {
          const workflowRunId =
            await SubscriptionPriceChangeService.trySchedulePriceChangeWorkflow(
              {
                subscriptionId: subscription.id,
                effectiveAt,
                scheduledCost,
                scheduledCurrency,
              },
              deps,
            );

          if (workflowRunId) {
            return await deps.repository.update(db, subscription.id, {
              priceChangeQstashMessageId: workflowRunId,
            });
          }
        }

        return subscription;
      }),
    );
  }

  private static resolveScheduledEffectiveAt(
    subscription: SubscriptionRecord,
    payload: SchedulePriceChangeInput,
    timezone?: string,
  ): string {
    if (payload.mode === "nextOccurrence") {
      return SubscriptionPriceChangeService.resolveNextOccurrenceEffectiveAt(
        subscription,
        timezone,
      );
    }

    if (!payload.customDate) {
      throw new CustomDateRequiredError();
    }

    const customEffectiveAt =
      SubscriptionPriceChangeService.toStartOfDayInTimezone(
        payload.customDate,
        timezone,
      );
    const nextOccurrenceEffectiveAt =
      SubscriptionPriceChangeService.resolveNextOccurrenceEffectiveAt(
        subscription,
        timezone,
      );

    if (
      SubscriptionPriceChangeService.isSameCalendarDayInTimezone(
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

    if (Date.parse(nextPaymentDate) > Date.now()) {
      return nextPaymentDate;
    }

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
      // Ignore locale; we only need day equality.
    );
  }

  private static assertCanSchedulePriceChange(
    subscription: SubscriptionRecord,
    effectiveAt: string,
  ): void {
    const status = getSubscriptionLifecycleStatus({
      willBeCancelledAt: SubscriptionService.normalizeDate(
        subscription.willBeCancelledAt,
      ),
    });

    if (status === "cancelled") {
      throw new CannotScheduleCancelledError();
    }

    const effectiveAtTime = Date.parse(effectiveAt);
    if (Number.isNaN(effectiveAtTime)) {
      throw new InvalidScheduledDateError();
    }

    if (effectiveAtTime <= Date.now()) {
      throw new ScheduledDateMustBeFutureError();
    }

    const cancellationTime = subscription.willBeCancelledAt
      ? Date.parse(
          SubscriptionService.normalizeDate(subscription.willBeCancelledAt) ??
            "",
        )
      : Number.NaN;

    if (
      !Number.isNaN(cancellationTime) &&
      effectiveAtTime >= cancellationTime
    ) {
      throw new ScheduledDateBeforeCancellationError();
    }
  }

  private static hasScheduledPriceChange(
    subscription: SubscriptionRecord,
  ): boolean {
    return Boolean(
      subscription.scheduledCost &&
        subscription.scheduledCurrency &&
        subscription.scheduledEffectiveAt,
    );
  }

  private static valuesMatchScheduledPriceChange(
    subscription: SubscriptionRecord,
    payload: {
      effectiveAt: string;
      scheduledCost: number;
      scheduledCurrency: string;
    },
  ): boolean {
    if (!SubscriptionPriceChangeService.hasScheduledPriceChange(subscription)) {
      return false;
    }

    const storedEffectiveAt = SubscriptionService.normalizeDate(
      subscription.scheduledEffectiveAt,
    );

    return (
      storedEffectiveAt ===
        SubscriptionService.normalizeDate(payload.effectiveAt) &&
      SubscriptionService.normalizeAmount(
        Number(subscription.scheduledCost),
      ) === SubscriptionService.normalizeAmount(payload.scheduledCost) &&
      subscription.scheduledCurrency === payload.scheduledCurrency
    );
  }

  static async tryCancelPriceChangeWorkflow(
    workflowRunId: string,
    deps: SubscriptionServiceDeps,
  ): Promise<void> {
    try {
      await deps.priceChangeWorkflow.cancel(workflowRunId);
    } catch (error) {
      console.error("Failed to cancel scheduled price-change workflow", {
        workflowRunId,
        error,
      });
    }
  }

  static async trySchedulePriceChangeWorkflow(
    payload: {
      subscriptionId: string;
      effectiveAt: string;
      scheduledCost: number;
      scheduledCurrency: string;
    },
    deps: SubscriptionServiceDeps,
  ): Promise<string | null> {
    try {
      return await deps.priceChangeWorkflow.schedule(payload);
    } catch (error) {
      console.error("Failed to schedule price-change workflow", {
        subscriptionId: payload.subscriptionId,
        effectiveAt: payload.effectiveAt,
        error,
      });

      return null;
    }
  }
}
