import { db } from "../../db";
import type {
  SubscriptionInsert,
  SubscriptionRecord,
} from "./subscriptionRepository";
import { SubscriptionRepository } from "./subscriptionRepository";
import { SubscriptionCalculator } from "./subscriptionCalculator";
import { SubscriptionMapper } from "./subscriptionMapper";
import { CurrencyService } from "../currency/currencyService";
import { SubscriptionNotificationsWorkflow } from "./subscriptionNotificationsWorkflow";
import { SubscriptionPriceChangeWorkflow } from "./subscriptionPriceChangeWorkflow";
import { UserService } from "../user/userService";
import { SubscriptionHistoryService } from "./subscriptionHistoryService";
import type {
  AddSubscriptionInput,
  SubscriptionDto,
  SubscriptionAction,
  UpdateSubscriptionInput,
  GetSubscriptionsParams,
  SubscriptionLifecycleStatus,
  SchedulePriceChangeInput,
} from "shared";
import {
  DateTimezoneUtils,
  RecurrenceUtils,
  getPlanById,
  getSubscriptionLifecycleStatus,
} from "shared";
import type { UserPreferences } from "shared";
import { isSameDay } from "date-fns";

type SubscriptionServiceDeps = {
  repository: typeof SubscriptionRepository;
  currencyService: typeof CurrencyService;
  workflow: typeof SubscriptionNotificationsWorkflow;
  priceChangeWorkflow: typeof SubscriptionPriceChangeWorkflow;
  userService: typeof UserService;
  historyService: typeof SubscriptionHistoryService;
};

type UpdateSubscriptionOptions = {
  trackHistory?: boolean;
};

const defaultDeps: SubscriptionServiceDeps = {
  repository: SubscriptionRepository,
  currencyService: CurrencyService,
  workflow: SubscriptionNotificationsWorkflow,
  priceChangeWorkflow: SubscriptionPriceChangeWorkflow,
  userService: UserService,
  historyService: SubscriptionHistoryService,
};

export class SubscriptionService {
  static async getSubscriptions(
    userId: string,
    params?: GetSubscriptionsParams,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto[]> {
    const [subscriptions, preferences] = await Promise.all([
      deps.repository.findByUserId(db, userId),
      deps.userService.getUserPreferences(userId),
    ]);
    const reconciledSubscriptions = await this.reconcileScheduledPriceChanges(
      subscriptions,
      deps,
    );

    const rates = await deps.currencyService.getRates(
      preferences.preferredCurrency,
    );

    const dtos = reconciledSubscriptions.map((subscription) =>
      this.mapToDto(subscription, preferences, rates),
    );

    return this.applyFilters(dtos, params);
  }

  static async getSubscriptionById(
    id: string,
    userId: string,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto> {
    const subscription = await deps.repository.findById(db, id);

    if (!subscription || subscription.userId !== userId) {
      throw new Error("Subscription not found");
    }
    const [reconciledSubscription] = await this.reconcileScheduledPriceChanges(
      [subscription],
      deps,
    );

    const preferences = await deps.userService.getUserPreferences(userId);
    const rates = await deps.currencyService.getRates(
      preferences.preferredCurrency,
    );

    return this.mapToDto(
      reconciledSubscription ?? subscription,
      preferences,
      rates,
    );
  }

  static async addSubscription(
    userId: string,
    payload: AddSubscriptionInput,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto> {
    const [currentCount, planId] = await Promise.all([
      deps.repository.countByUserId(db, userId),
      deps.userService.getPlanId(userId),
    ]);
    const maxSubscriptions = getPlanById(planId).limits.maxSubscriptions;

    if (currentCount >= maxSubscriptions) {
      throw new Error("Subscription limit reached");
    }

    const created = await deps.repository.create(
      db,
      this.toInsertPayload(userId, payload),
    );

    const result = this.shouldScheduleWorkflow(created)
      ? await this.tryScheduleWorkflow(created, deps)
      : created;

    const { preferences, rates } = await this.getPreferencesAndRates(
      userId,
      deps,
    );

    const dto = this.mapToDto(result, preferences, rates);

    await this.logHistoryAction(
      {
        subscriptionId: dto.id,
        userId,
        action: "created",
        snapshot: dto,
      },
      deps,
    );

    return dto;
  }

  static async updateSubscription(
    id: string,
    userId: string,
    payload: UpdateSubscriptionInput,
    options: UpdateSubscriptionOptions = {},
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto> {
    const existing = await deps.repository.findById(db, id);

    if (!existing || existing.userId !== userId) {
      throw new Error("Subscription not found");
    }

    if (existing.qstashMessageId) {
      await this.tryCancelWorkflow(existing.qstashMessageId, deps);
    }

    const shouldClearScheduledPriceChange =
      this.shouldClearScheduledPriceChange(existing, payload);

    if (
      shouldClearScheduledPriceChange &&
      existing.priceChangeQstashMessageId
    ) {
      await this.tryCancelPriceChangeWorkflow(
        existing.priceChangeQstashMessageId,
        deps,
      );
    }

    const updated = await deps.repository.update(db, id, {
      ...this.toUpdatePayload(payload),
      qstashMessageId: null,
      ...(shouldClearScheduledPriceChange
        ? {
            scheduledCost: null,
            scheduledCurrency: null,
            scheduledEffectiveAt: null,
            priceChangeQstashMessageId: null,
          }
        : undefined),
    });

    const result = this.shouldScheduleWorkflow(updated)
      ? await this.tryScheduleWorkflow(updated, deps)
      : updated;

    const { preferences, rates } = await this.getPreferencesAndRates(
      userId,
      deps,
    );

    const previousDto = this.mapToDto(existing, preferences, rates);
    const dto = this.mapToDto(result, preferences, rates);

    if (options.trackHistory !== false) {
      await this.logHistoryAction(
        {
          subscriptionId: dto.id,
          userId,
          action: "updated",
          snapshot: {
            before: previousDto,
            after: dto,
          },
        },
        deps,
      );
    }

    return dto;
  }

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

    const { preferences, rates } = await this.getPreferencesAndRates(
      userId,
      deps,
    );
    const previousDto = this.mapToDto(existing, preferences, rates);

    const effectiveAt = this.resolveScheduledEffectiveAt(
      existing,
      payload,
      preferences.preferredTimezone,
    );

    this.assertCanSchedulePriceChange(existing, effectiveAt);

    if (existing.priceChangeQstashMessageId) {
      await this.tryCancelPriceChangeWorkflow(
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
    const workflowRunId = await this.trySchedulePriceChangeWorkflow(
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
        await this.tryCancelPriceChangeWorkflow(workflowRunId, deps);
      }
      throw error;
    }

    const dto = this.mapToDto(updated, preferences, rates);

    await this.logHistoryAction(
      {
        subscriptionId: dto.id,
        userId,
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

    if (!this.hasScheduledPriceChange(existing)) {
      throw new Error("No scheduled price change");
    }

    const { preferences, rates } = await this.getPreferencesAndRates(
      userId,
      deps,
    );
    const previousDto = this.mapToDto(existing, preferences, rates);

    if (existing.priceChangeQstashMessageId) {
      await this.tryCancelPriceChangeWorkflow(
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

    const dto = this.mapToDto(updated, preferences, rates);

    await this.logHistoryAction(
      {
        subscriptionId: dto.id,
        userId,
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

    if (!this.hasScheduledPriceChange(existing)) {
      throw new Error("No scheduled price change");
    }

    if (existing.priceChangeQstashMessageId) {
      await this.tryCancelPriceChangeWorkflow(
        existing.priceChangeQstashMessageId,
        deps,
      );
    }

    const { preferences, rates } = await this.getPreferencesAndRates(
      userId,
      deps,
    );

    const previousDto = this.mapToDto(existing, preferences, rates);

    const updated = await deps.repository.update(db, id, {
      cost: existing.scheduledCost ?? existing.cost,
      currency: existing.scheduledCurrency ?? existing.currency,
      scheduledCost: null,
      scheduledCurrency: null,
      scheduledEffectiveAt: null,
      priceChangeQstashMessageId: null,
    });

    const dto = this.mapToDto(updated, preferences, rates);

    await this.logHistoryAction(
      {
        subscriptionId: dto.id,
        userId,
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

    if (!this.valuesMatchScheduledPriceChange(existing, payload)) {
      return;
    }

    const { preferences, rates } = await this.getPreferencesAndRates(
      existing.userId,
      deps,
    );
    const previousDto = this.mapToDto(existing, preferences, rates);

    const updated = await deps.repository.update(db, existing.id, {
      cost: existing.scheduledCost ?? existing.cost,
      currency: existing.scheduledCurrency ?? existing.currency,
      scheduledCost: null,
      scheduledCurrency: null,
      scheduledEffectiveAt: null,
      priceChangeQstashMessageId: null,
    });

    const dto = this.mapToDto(updated, preferences, rates);

    await this.logHistoryAction(
      {
        subscriptionId: dto.id,
        userId: existing.userId,
        action: "updated",
        snapshot: {
          before: previousDto,
          after: dto,
        },
      },
      deps,
    );
  }

  static async deleteSubscription(
    id: string,
    userId: string,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<void> {
    const existing = await deps.repository.findById(db, id);

    if (!existing || existing.userId !== userId) {
      throw new Error("Subscription not found");
    }

    if (existing.qstashMessageId) {
      await this.tryCancelWorkflow(existing.qstashMessageId, deps);
    }

    if (existing.priceChangeQstashMessageId) {
      await this.tryCancelPriceChangeWorkflow(
        existing.priceChangeQstashMessageId,
        deps,
      );
    }

    let historySnapshot: unknown = existing;

    try {
      const { preferences, rates } = await this.getPreferencesAndRates(
        userId,
        deps,
      );
      historySnapshot = this.mapToDto(existing, preferences, rates);
    } catch (error) {
      console.error("Failed to prepare delete history snapshot", {
        subscriptionId: id,
        userId,
        error,
      });
    }

    await this.logHistoryAction(
      {
        subscriptionId: id,
        userId,
        action: "deleted",
        snapshot: historySnapshot,
      },
      deps,
    );

    await deps.repository.delete(db, id);
  }

  static async cancelSubscription(
    id: string,
    userId: string,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto> {
    const existing = await deps.repository.findById(db, id);

    if (!existing || existing.userId !== userId) {
      throw new Error("Subscription not found");
    }

    const userPreferences = await deps.userService.getUserPreferences(userId);
    const { nextPaymentDate } = SubscriptionCalculator.calculatePaymentDates(
      existing,
      userPreferences.preferredTimezone,
    );

    const updated = await deps.repository.update(db, id, {
      willBeCancelledAt: new Date(nextPaymentDate),
      paymentDate: nextPaymentDate,
      qstashMessageId: null,
      scheduledCost: null,
      scheduledCurrency: null,
      scheduledEffectiveAt: null,
      priceChangeQstashMessageId: null,
    });

    if (existing.qstashMessageId) {
      await this.tryCancelWorkflow(existing.qstashMessageId, deps);
    }

    if (existing.priceChangeQstashMessageId) {
      await this.tryCancelPriceChangeWorkflow(
        existing.priceChangeQstashMessageId,
        deps,
      );
    }

    const { preferences, rates } = await this.getPreferencesAndRates(
      userId,
      deps,
    );

    const dto = this.mapToDto(updated, preferences, rates);

    await this.logHistoryAction(
      {
        subscriptionId: dto.id,
        userId,
        action: "cancelled",
        snapshot: dto,
      },
      deps,
    );

    return dto;
  }

  static async deleteAllForUser(
    userId: string,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<void> {
    const existing = await deps.repository.findByUserId(db, userId);

    await Promise.all(
      existing.map(async (subscription) => {
        if (subscription.qstashMessageId) {
          await this.tryCancelWorkflow(subscription.qstashMessageId, deps);
        }

        if (subscription.priceChangeQstashMessageId) {
          await this.tryCancelPriceChangeWorkflow(
            subscription.priceChangeQstashMessageId,
            deps,
          );
        }
      }),
    );

    await deps.repository.deleteByUserId(db, userId);
  }

  static async rescheduleUserNotifications(
    userId: string,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<void> {
    const subscriptions = await deps.repository.findByUserId(db, userId);

    await Promise.all(
      subscriptions.map(async (subscription) => {
        if (subscription.qstashMessageId) {
          await this.tryCancelWorkflow(subscription.qstashMessageId, deps);
        }
        if (this.shouldScheduleWorkflow(subscription)) {
          await this.tryScheduleWorkflow(subscription, deps);
        } else if (subscription.qstashMessageId !== null) {
          await deps.repository.update(db, subscription.id, {
            qstashMessageId: null,
          });
        }
      }),
    );
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

    const scheduledPriceChange = this.toScheduledPriceChange(
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

    if (!Number.isFinite(amount)) {
      return null;
    }

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
      effectiveAt: this.normalizeDate(subscription.scheduledEffectiveAt)!,
      billing,
    };
  }

  private static toInsertPayload(
    userId: string,
    payload: AddSubscriptionInput,
  ): SubscriptionInsert {
    const willBeCancelledAt = this.normalizeTimestamp(
      payload.willBeCancelledAt,
    );

    return {
      userId,
      ...this.toDbPayload(payload),
      willBeCancelledAt: willBeCancelledAt ?? undefined,
    } as SubscriptionInsert;
  }

  private static toUpdatePayload(
    payload: UpdateSubscriptionInput,
  ): Partial<SubscriptionInsert> {
    const { willBeCancelledAt, ...restPayload } = payload;
    const dbPayload = this.toDbPayload(restPayload);
    const normalizedCancellation = this.normalizeTimestamp(willBeCancelledAt);

    if (willBeCancelledAt !== undefined) {
      dbPayload.willBeCancelledAt = normalizedCancellation;

      // Cancellation resets the billing anchor so recurring projections stay consistent.
      if (normalizedCancellation) {
        dbPayload.paymentDate = normalizedCancellation.toISOString();
      }
    }

    return this.stripUndefined(dbPayload);
  }

  private static toDbPayload(
    payload: AddSubscriptionInput | UpdateSubscriptionInput,
  ): Partial<SubscriptionInsert> {
    const { willBeCancelledAt: _willBeCancelledAt, ...rest } = payload;

    return {
      ...rest,
      cost: rest.cost !== undefined ? rest.cost.toString() : undefined,
      paymentDate:
        rest.paymentDate !== undefined
          ? new Date(rest.paymentDate).toISOString()
          : undefined,
    };
  }

  private static stripUndefined<T extends Record<string, unknown>>(
    value: T,
  ): Partial<T> {
    return Object.fromEntries(
      Object.entries(value).filter(
        ([, entryValue]) => entryValue !== undefined,
      ),
    ) as Partial<T>;
  }

  private static async scheduleWorkflow(
    subscription: SubscriptionRecord,
    deps: SubscriptionServiceDeps,
  ): Promise<SubscriptionRecord> {
    const workflowRunId = await deps.workflow.schedule({
      subscriptionId: subscription.id,
      paymentDate: subscription.paymentDate,
    });

    return await deps.repository.update(db, subscription.id, {
      qstashMessageId: workflowRunId,
    });
  }

  private static async tryScheduleWorkflow(
    subscription: SubscriptionRecord,
    deps: SubscriptionServiceDeps,
  ): Promise<SubscriptionRecord> {
    try {
      return await this.scheduleWorkflow(subscription, deps);
    } catch (error) {
      console.error("Failed to schedule subscription notifications", {
        subscriptionId: subscription.id,
        error,
      });

      return subscription;
    }
  }

  private static async tryCancelWorkflow(
    workflowRunId: string,
    deps: SubscriptionServiceDeps,
  ): Promise<void> {
    try {
      await deps.workflow.cancel(workflowRunId);
    } catch (error) {
      console.error("Failed to cancel subscription notifications", {
        workflowRunId,
        error,
      });
    }
  }

  private static async tryCancelPriceChangeWorkflow(
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

  private static async trySchedulePriceChangeWorkflow(
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

  private static shouldScheduleWorkflow(
    subscription: SubscriptionRecord,
  ): boolean {
    const paymentDate = this.normalizeDate(subscription.paymentDate);
    if (!paymentDate) {
      return false;
    }

    const cancellationDate = this.normalizeDate(subscription.willBeCancelledAt);
    if (
      cancellationDate &&
      new Date(paymentDate).getTime() >= new Date(cancellationDate).getTime()
    ) {
      return false;
    }

    const status = getSubscriptionLifecycleStatus({
      willBeCancelledAt: cancellationDate,
    });

    return status !== "cancelled";
  }

  private static async getPreferencesAndRates(
    userId: string,
    deps: SubscriptionServiceDeps,
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
      action,
      snapshot,
    }: {
      subscriptionId: string | null;
      userId: string;
      action: SubscriptionAction;
      snapshot: unknown;
    },
    deps: SubscriptionServiceDeps,
  ): Promise<void> {
    try {
      const preparedSnapshot =
        action === "updated" && !this.isUpdateDiffSnapshot(snapshot)
          ? { before: null, after: snapshot }
          : snapshot;

      await deps.historyService.logAction(
        subscriptionId,
        userId,
        action,
        preparedSnapshot,
      );
    } catch (error) {
      console.error("Failed to log subscription history", {
        subscriptionId,
        userId,
        action,
        error,
      });

      if (process.env.NODE_ENV !== "production") {
        throw error;
      }
    }
  }

  private static applyFilters(
    dtos: SubscriptionDto[],
    params?: GetSubscriptionsParams,
  ): SubscriptionDto[] {
    const search = params?.search?.trim().toLowerCase();
    const sortBy = params?.sortBy ?? "nextPaymentDate";
    const direction = params?.direction ?? "asc";
    const status = params?.status ?? "active"; // Default to active

    let filtered = dtos;

    if (status !== "all") {
      filtered = filtered.filter((dto) => {
        if (status === "active") return dto.status === "active";
        if (status === "cancelledButActive") {
          return dto.status === "cancelledButActive";
        }
        if (status === "cancelled") {
          return this.isCancelledFilterMatch(dto.status);
        }
        return true;
      });
    }

    if (search) {
      filtered = filtered.filter((dto) =>
        dto.name.toLowerCase().includes(search),
      );
    }

    return [...filtered].sort((a, b) => {
      const multiplier = direction === "asc" ? 1 : -1;

      if (sortBy === "name") {
        return a.name.localeCompare(b.name) * multiplier;
      }

      if (sortBy === "cost") {
        return (
          (a.billing.preferred.monthly - b.billing.preferred.monthly) *
          multiplier
        );
      }

      const aTime = Date.parse(a.nextPaymentDate);
      const bTime = Date.parse(b.nextPaymentDate);
      return (aTime - bTime) * multiplier;
    });
  }

  private static isCancelledFilterMatch(
    status: SubscriptionLifecycleStatus,
  ): boolean {
    return status === "cancelled";
  }

  private static normalizeTimestamp(
    value?: string | null,
  ): Date | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (!value) {
      return null;
    }

    return new Date(value);
  }

  private static normalizeDate(value?: string | Date | null): string | null {
    if (!value) return null;
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }

  private static isUpdateDiffSnapshot(
    snapshot: unknown,
  ): snapshot is { before: unknown; after: unknown } {
    if (!snapshot || typeof snapshot !== "object") {
      return false;
    }

    return "before" in snapshot && "after" in snapshot;
  }

  private static shouldClearScheduledPriceChange(
    subscription: SubscriptionRecord,
    payload: UpdateSubscriptionInput,
  ): boolean {
    if (!subscription.scheduledCost || !subscription.scheduledEffectiveAt) {
      return false;
    }

    if (payload.cost === undefined && payload.currency === undefined) {
      return false;
    }

    const existingCost = Number(subscription.cost);
    const nextCost = payload.cost ?? existingCost;

    const existingCurrency = subscription.currency;
    const nextCurrency = payload.currency ?? existingCurrency;

    return (
      this.normalizeAmount(nextCost) !== this.normalizeAmount(existingCost) ||
      nextCurrency !== existingCurrency
    );
  }

  private static resolveScheduledEffectiveAt(
    subscription: SubscriptionRecord,
    payload: SchedulePriceChangeInput,
    timezone?: string,
  ): string {
    if (payload.mode === "nextOccurrence") {
      return this.resolveNextOccurrenceEffectiveAt(subscription, timezone);
    }

    if (!payload.customDate) {
      throw new Error("Custom date is required for custom-date mode");
    }

    const customEffectiveAt = this.toStartOfDayInTimezone(
      payload.customDate,
      timezone,
    );
    const nextOccurrenceEffectiveAt = this.resolveNextOccurrenceEffectiveAt(
      subscription,
      timezone,
    );

    if (
      this.isSameCalendarDayInTimezone(
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
    );
  }

  private static assertCanSchedulePriceChange(
    subscription: SubscriptionRecord,
    effectiveAt: string,
  ): void {
    const status = getSubscriptionLifecycleStatus({
      willBeCancelledAt: this.normalizeDate(subscription.willBeCancelledAt),
    });

    if (status === "cancelled") {
      throw new Error(
        "Cannot schedule a price change for a cancelled subscription",
      );
    }

    const effectiveAtTime = Date.parse(effectiveAt);
    if (Number.isNaN(effectiveAtTime)) {
      throw new Error("Invalid scheduled effective date");
    }

    if (effectiveAtTime <= Date.now()) {
      throw new Error("Scheduled effective date must be in the future");
    }

    const cancellationTime = subscription.willBeCancelledAt
      ? Date.parse(this.normalizeDate(subscription.willBeCancelledAt) ?? "")
      : Number.NaN;

    if (
      !Number.isNaN(cancellationTime) &&
      effectiveAtTime >= cancellationTime
    ) {
      throw new Error(
        "Scheduled effective date must be before the cancellation date",
      );
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
    if (!this.hasScheduledPriceChange(subscription)) {
      return false;
    }

    const storedEffectiveAt = this.normalizeDate(
      subscription.scheduledEffectiveAt,
    );

    return (
      storedEffectiveAt === this.normalizeDate(payload.effectiveAt) &&
      this.normalizeAmount(Number(subscription.scheduledCost)) ===
        this.normalizeAmount(payload.scheduledCost) &&
      subscription.scheduledCurrency === payload.scheduledCurrency
    );
  }

  private static normalizeAmount(value: number): string {
    return value.toFixed(2);
  }

  private static async reconcileScheduledPriceChanges(
    subscriptions: SubscriptionRecord[],
    deps: SubscriptionServiceDeps,
  ): Promise<SubscriptionRecord[]> {
    return await Promise.all(
      subscriptions.map(async (subscription) => {
        if (!this.hasScheduledPriceChange(subscription)) {
          return subscription;
        }

        const effectiveAt = this.normalizeDate(
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
          await this.applyScheduledPriceChangeByWorkflow(
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
          const workflowRunId = await this.trySchedulePriceChangeWorkflow(
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
}
