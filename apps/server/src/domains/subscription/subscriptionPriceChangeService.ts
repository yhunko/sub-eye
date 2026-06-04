import type {
  SchedulePriceChangeInput,
  SubscriptionAction,
  SubscriptionDto,
  UserPreferences,
} from "@subeye/shared";
import {
  DateTimezoneUtils,
  getSubscriptionLifecycleStatus,
  RecurrenceUtils,
} from "@subeye/shared";
import { isSameDay } from "date-fns";
import { CurrencyService } from "../currency/currencyService";
import { UserService } from "../user/userService";
import { SubscriptionCalculator } from "./subscriptionCalculator";
import {
  CannotScheduleCancelledError,
  CustomDateRequiredError,
  InvalidScheduledDateError,
  NoScheduledPriceChangeError,
  ScheduledDateBeforeCancellationError,
  ScheduledDateMustBeFutureError,
} from "./subscriptionErrors";
import { SubscriptionHistoryService } from "./subscriptionHistoryService";
import { SubscriptionMapper } from "./subscriptionMapper";
import type { SubscriptionRecord } from "./subscriptionRepository";
import { SubscriptionRepository } from "./subscriptionRepository";

type PriceChangeWorkflowApi = {
  schedule: (payload: {
    subscriptionId: string;
    effectiveAt: string;
    scheduledCost: number;
    scheduledCurrency: string;
  }) => Promise<string>;
  cancel: (workflowRunId: string) => Promise<void>;
};

export type SubscriptionPriceChangeServiceDeps = {
  repository: typeof SubscriptionRepository;
  currencyService: typeof CurrencyService;
  priceChangeWorkflow: PriceChangeWorkflowApi;
  userService: typeof UserService;
  historyService: typeof SubscriptionHistoryService;
};

let priceChangeWorkflowModule: PriceChangeWorkflowApi | undefined;
const getPriceChangeWorkflow = (): PriceChangeWorkflowApi => {
  if (!priceChangeWorkflowModule) {
    priceChangeWorkflowModule =
      require("./subscriptionPriceChangeWorkflow").SubscriptionPriceChangeWorkflow;
  }
  return priceChangeWorkflowModule!;
};

const defaultDeps: SubscriptionPriceChangeServiceDeps = {
  repository: SubscriptionRepository,
  currencyService: CurrencyService,
  get priceChangeWorkflow() {
    return getPriceChangeWorkflow();
  },
  userService: UserService,
  historyService: SubscriptionHistoryService,
};

export class SubscriptionPriceChangeService {
  static async schedulePriceChange(
    id: string,
    userId: string,
    payload: SchedulePriceChangeInput,
    deps: SubscriptionPriceChangeServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto> {
    const existing = await deps.repository.findById(id);
    if (!existing || existing.userId !== userId)
      throw new Error("Subscription not found");

    const { preferences, rates } =
      await SubscriptionPriceChangeService.getPreferencesAndRates(userId, deps);
    const previousDto = SubscriptionPriceChangeService.mapToDto(
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
    const workflowRunId =
      await SubscriptionPriceChangeService.trySchedulePriceChangeWorkflow(
        {
          subscriptionId: existing.id,
          effectiveAt,
          scheduledCost: payload.scheduledCost,
          scheduledCurrency,
        },
        deps,
      );

    let updated: SubscriptionRecord;
    try {
      updated = await deps.repository.update(id, {
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

    const dto = SubscriptionPriceChangeService.mapToDto(
      updated,
      preferences,
      rates,
    );

    await SubscriptionPriceChangeService.logHistoryAction(
      {
        subscriptionId: dto.id,
        userId,
        orgId: existing.orgId,
        action: "updated",
        snapshot: { before: previousDto, after: dto },
      },
      deps,
    );

    return dto;
  }

  static async cancelScheduledPriceChange(
    id: string,
    userId: string,
    deps: SubscriptionPriceChangeServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto> {
    const existing = await deps.repository.findById(id);
    if (!existing || existing.userId !== userId)
      throw new Error("Subscription not found");
    if (!SubscriptionPriceChangeService.hasScheduledPriceChange(existing)) {
      throw new NoScheduledPriceChangeError();
    }

    const { preferences, rates } =
      await SubscriptionPriceChangeService.getPreferencesAndRates(userId, deps);
    const previousDto = SubscriptionPriceChangeService.mapToDto(
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

    const updated = await deps.repository.update(id, {
      scheduledCost: null,
      scheduledCurrency: null,
      scheduledEffectiveAt: null,
      priceChangeQstashMessageId: null,
    });
    const dto = SubscriptionPriceChangeService.mapToDto(
      updated,
      preferences,
      rates,
    );

    await SubscriptionPriceChangeService.logHistoryAction(
      {
        subscriptionId: dto.id,
        userId,
        orgId: existing.orgId,
        action: "updated",
        snapshot: { before: previousDto, after: dto },
      },
      deps,
    );

    return dto;
  }

  static async applyScheduledPriceChangeNow(
    id: string,
    userId: string,
    deps: SubscriptionPriceChangeServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto> {
    const existing = await deps.repository.findById(id);
    if (!existing || existing.userId !== userId)
      throw new Error("Subscription not found");
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
      await SubscriptionPriceChangeService.getPreferencesAndRates(userId, deps);
    const previousDto = SubscriptionPriceChangeService.mapToDto(
      existing,
      preferences,
      rates,
    );

    const updated = await deps.repository.update(id, {
      cost: existing.scheduledCost ?? existing.cost,
      currency: existing.scheduledCurrency ?? existing.currency,
      scheduledCost: null,
      scheduledCurrency: null,
      scheduledEffectiveAt: null,
      priceChangeQstashMessageId: null,
    });
    const dto = SubscriptionPriceChangeService.mapToDto(
      updated,
      preferences,
      rates,
    );

    await SubscriptionPriceChangeService.logHistoryAction(
      {
        subscriptionId: dto.id,
        userId,
        orgId: existing.orgId,
        action: "updated",
        snapshot: { before: previousDto, after: dto },
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
    deps: SubscriptionPriceChangeServiceDeps = defaultDeps,
  ): Promise<void> {
    const existing = await deps.repository.findById(payload.subscriptionId);
    if (!existing) return;
    if (
      !SubscriptionPriceChangeService.valuesMatchScheduledPriceChange(
        existing,
        payload,
      )
    ) {
      return;
    }

    const { preferences, rates } =
      await SubscriptionPriceChangeService.getPreferencesAndRates(
        existing.userId,
        deps,
      );
    const previousDto = SubscriptionPriceChangeService.mapToDto(
      existing,
      preferences,
      rates,
    );

    const updated = await deps.repository.update(existing.id, {
      cost: existing.scheduledCost ?? existing.cost,
      currency: existing.scheduledCurrency ?? existing.currency,
      scheduledCost: null,
      scheduledCurrency: null,
      scheduledEffectiveAt: null,
      priceChangeQstashMessageId: null,
    });
    const dto = SubscriptionPriceChangeService.mapToDto(
      updated,
      preferences,
      rates,
    );

    await SubscriptionPriceChangeService.logHistoryAction(
      {
        subscriptionId: dto.id,
        userId: existing.userId,
        orgId: existing.orgId,
        action: "updated",
        snapshot: { before: previousDto, after: dto },
      },
      deps,
    );
  }

  static async reconcileScheduledPriceChanges(
    subscriptions: SubscriptionRecord[],
    deps: SubscriptionPriceChangeServiceDeps = defaultDeps,
  ): Promise<SubscriptionRecord[]> {
    return await Promise.all(
      subscriptions.map(async (subscription) => {
        if (
          !SubscriptionPriceChangeService.hasScheduledPriceChange(subscription)
        ) {
          return subscription;
        }
        const effectiveAt = SubscriptionPriceChangeService.normalizeDate(
          subscription.scheduledEffectiveAt,
        );
        const scheduledCurrency = subscription.scheduledCurrency;
        const scheduledCostRaw = subscription.scheduledCost;
        if (!effectiveAt || !scheduledCurrency || !scheduledCostRaw)
          return subscription;

        const scheduledCost = Number(scheduledCostRaw);
        if (!Number.isFinite(scheduledCost)) return subscription;

        if (Date.parse(effectiveAt) <= Date.now()) {
          await SubscriptionPriceChangeService.applyScheduledPriceChangeByWorkflow(
            {
              subscriptionId: subscription.id,
              effectiveAt,
              scheduledCost,
              scheduledCurrency,
            },
            deps,
          );
          const refreshed = await deps.repository.findById(subscription.id);
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
            return await deps.repository.update(subscription.id, {
              priceChangeQstashMessageId: workflowRunId,
            });
          }
        }
        return subscription;
      }),
    );
  }

  static async tryCancelPriceChangeWorkflow(
    workflowRunId: string,
    deps: SubscriptionPriceChangeServiceDeps,
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

  private static async getPreferencesAndRates(
    userId: string,
    deps: SubscriptionPriceChangeServiceDeps,
  ): Promise<{ preferences: UserPreferences; rates: Record<string, number> }> {
    const preferences = await deps.userService.getUserPreferences(userId);
    const rates = await deps.currencyService.getRates(
      preferences.preferredCurrency,
    );
    return { preferences, rates };
  }

  private static mapToDto(
    subscription: SubscriptionRecord,
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
    const scheduledPriceChange =
      SubscriptionPriceChangeService.toScheduledPriceChange(
        subscription,
        preferences,
        rates,
      );

    return SubscriptionMapper.toDto(
      subscription,
      billing,
      nextPaymentDate,
      lastPaymentDate,
      scheduledPriceChange,
    );
  }

  private static toScheduledPriceChange(
    subscription: SubscriptionRecord,
    preferences: UserPreferences,
    rates: Record<string, number>,
  ): SubscriptionDto["scheduledPriceChange"] {
    if (
      !subscription.scheduledCost ||
      !subscription.scheduledCurrency ||
      !subscription.scheduledEffectiveAt
    ) {
      return null;
    }
    const amount = Number(subscription.scheduledCost);
    if (!Number.isFinite(amount)) return null;

    const billing = SubscriptionCalculator.calculateBillingDetailsForPricing(
      {
        amount,
        currency: subscription.scheduledCurrency,
        every: subscription.every,
        period: subscription.period,
      },
      preferences.preferredCurrency,
      rates,
    );

    return {
      cost: amount,
      currency: subscription.scheduledCurrency,
      effectiveAt: SubscriptionPriceChangeService.normalizeDate(
        subscription.scheduledEffectiveAt,
      )!,
      billing,
    };
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
    deps: SubscriptionPriceChangeServiceDeps,
  ): Promise<void> {
    try {
      const preparedSnapshot =
        action === "updated" &&
        !SubscriptionPriceChangeService.isUpdateDiffSnapshot(snapshot)
          ? { before: null, after: snapshot }
          : snapshot;

      await deps.historyService.logAction(
        subscriptionId,
        userId,
        action,
        preparedSnapshot,
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

  private static isUpdateDiffSnapshot(
    snapshot: unknown,
  ): snapshot is { before: unknown; after: unknown } {
    return Boolean(
      snapshot &&
        typeof snapshot === "object" &&
        "before" in snapshot &&
        "after" in snapshot,
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
    if (!payload.customDate) throw new CustomDateRequiredError();

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

  private static assertCanSchedulePriceChange(
    subscription: SubscriptionRecord,
    effectiveAt: string,
  ): void {
    const status = getSubscriptionLifecycleStatus({
      willBeCancelledAt: SubscriptionPriceChangeService.normalizeDate(
        subscription.willBeCancelledAt,
      ),
    });
    if (status === "cancelled") throw new CannotScheduleCancelledError();

    const effectiveAtTime = Date.parse(effectiveAt);
    if (Number.isNaN(effectiveAtTime)) throw new InvalidScheduledDateError();
    if (effectiveAtTime <= Date.now())
      throw new ScheduledDateMustBeFutureError();

    const cancellationTime = subscription.willBeCancelledAt
      ? Date.parse(
          SubscriptionPriceChangeService.normalizeDate(
            subscription.willBeCancelledAt,
          ) ?? "",
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
    const storedEffectiveAt = SubscriptionPriceChangeService.normalizeDate(
      subscription.scheduledEffectiveAt,
    );
    return (
      storedEffectiveAt ===
        SubscriptionPriceChangeService.normalizeDate(payload.effectiveAt) &&
      SubscriptionPriceChangeService.normalizeAmount(
        Number(subscription.scheduledCost),
      ) ===
        SubscriptionPriceChangeService.normalizeAmount(payload.scheduledCost) &&
      subscription.scheduledCurrency === payload.scheduledCurrency
    );
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

  private static async trySchedulePriceChangeWorkflow(
    payload: {
      subscriptionId: string;
      effectiveAt: string;
      scheduledCost: number;
      scheduledCurrency: string;
    },
    deps: SubscriptionPriceChangeServiceDeps,
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
