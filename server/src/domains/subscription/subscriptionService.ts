import type {
  AddSubscriptionInput,
  BulkDeleteSubscriptionsInput,
  BulkUpdateCategoryInput,
  GetSubscriptionsParams,
  SubscriptionAction,
  SubscriptionDto,
  SubscriptionLifecycleStatus,
  UpdateSubscriptionInput,
  UserPreferences,
} from "shared";
import { getPlanById } from "shared";
import { db } from "../../db";
import { CategoryRepository } from "../category/categoryRepository";
import { CurrencyService } from "../currency/currencyService";
import { OrgService } from "../org/orgService";
import { UserService } from "../user/userService";
import { SubscriptionCalculator } from "./subscriptionCalculator";
import { SubscriptionCancellationWorkflow } from "./subscriptionCancellationWorkflow";
import {
  SubscriptionCategoryNotFoundError,
  SubscriptionLimitReachedError,
  SubscriptionNotFoundError,
} from "./subscriptionErrors";
import { SubscriptionHistoryService } from "./subscriptionHistoryService";
import { SubscriptionMapper } from "./subscriptionMapper";
import { SubscriptionNotificationsWorkflow } from "./subscriptionNotificationsWorkflow";
import { SubscriptionPriceChangeService } from "./subscriptionPriceChangeService";
import type {
  SubscriptionInsert,
  SubscriptionRecord,
} from "./subscriptionRepository";
import { SubscriptionRepository } from "./subscriptionRepository";
import { SubscriptionSchedulingService } from "./subscriptionSchedulingService";

export type PriceChangeWorkflowApi = {
  schedule: (payload: {
    subscriptionId: string;
    effectiveAt: string;
    scheduledCost: number;
    scheduledCurrency: string;
  }) => Promise<string>;
  cancel: (workflowRunId: string) => Promise<void>;
};

export type SubscriptionServiceDeps = {
  repository: typeof SubscriptionRepository;
  currencyService: typeof CurrencyService;
  workflow: typeof SubscriptionNotificationsWorkflow;
  cancellationWorkflow: typeof SubscriptionCancellationWorkflow;
  priceChangeWorkflow: PriceChangeWorkflowApi;
  userService: typeof UserService;
  orgService: typeof OrgService;
  historyService: typeof SubscriptionHistoryService;
  categoryRepository: typeof CategoryRepository;
};

type UpdateSubscriptionOptions = {
  trackHistory?: boolean;
};

// Lazy-loaded module reference to avoid circular dependency
let priceChangeWorkflowModule: PriceChangeWorkflowApi | undefined;
export const getPriceChangeWorkflow = (): PriceChangeWorkflowApi => {
  if (!priceChangeWorkflowModule) {
    // Dynamic import is safe here - module will be loaded on first access
    priceChangeWorkflowModule =
      require("./subscriptionPriceChangeWorkflow").SubscriptionPriceChangeWorkflow;
  }
  return priceChangeWorkflowModule!;
};

export const defaultDeps: SubscriptionServiceDeps = {
  repository: SubscriptionRepository,
  currencyService: CurrencyService,
  workflow: SubscriptionNotificationsWorkflow,
  cancellationWorkflow: SubscriptionCancellationWorkflow,
  get priceChangeWorkflow() {
    return getPriceChangeWorkflow();
  },
  userService: UserService,
  orgService: OrgService,
  historyService: SubscriptionHistoryService,
  categoryRepository: CategoryRepository,
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
    const reconciledSubscriptions =
      await SubscriptionPriceChangeService.reconcileScheduledPriceChanges(
        subscriptions,
        deps,
      );

    const rates = await deps.currencyService.getRates(
      preferences.preferredCurrency,
    );

    const dtos = reconciledSubscriptions.map((subscription) =>
      SubscriptionService.mapToDto(subscription, preferences, rates),
    );

    return SubscriptionService.applyFilters(dtos, params);
  }

  static async getSubscriptionById(
    id: string,
    userId: string,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto> {
    const subscription = await deps.repository.findById(db, id);

    if (!subscription || subscription.userId !== userId) {
      throw new SubscriptionNotFoundError();
    }
    const [reconciledSubscription] =
      await SubscriptionPriceChangeService.reconcileScheduledPriceChanges(
        [subscription],
        deps,
      );

    const preferences = await deps.userService.getUserPreferences(userId);
    const rates = await deps.currencyService.getRates(
      preferences.preferredCurrency,
    );

    return SubscriptionService.mapToDto(
      reconciledSubscription ?? subscription,
      preferences,
      rates,
    );
  }

  static async addSubscription(
    userId: string,
    payload: AddSubscriptionInput,
    orgId?: string | null,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto> {
    const effectiveOrgId = orgId ?? null;

    await SubscriptionService.assertCategoryBelongsToSpace(
      userId,
      effectiveOrgId,
      payload.categoryId,
      deps,
    );

    const [currentCount, planId] = await Promise.all([
      effectiveOrgId
        ? deps.repository.countByOrgId(db, effectiveOrgId)
        : deps.repository.countByUserId(db, userId),
      effectiveOrgId
        ? deps.orgService.getOrgPlanId(effectiveOrgId)
        : deps.userService.getPlanId(userId),
    ]);
    const maxSubscriptions = getPlanById(planId).limits.maxSubscriptions;

    if (maxSubscriptions !== null && currentCount >= maxSubscriptions) {
      throw new SubscriptionLimitReachedError();
    }

    const created = await deps.repository.create(
      db,
      SubscriptionService.toInsertPayload(userId, effectiveOrgId, payload),
    );

    const withRenewalWorkflow =
      SubscriptionSchedulingService.shouldScheduleWorkflow(created)
        ? await SubscriptionSchedulingService.tryScheduleWorkflow(created, deps)
        : created;
    const result =
      SubscriptionSchedulingService.shouldScheduleCancellationWorkflow(
        withRenewalWorkflow,
      )
        ? await SubscriptionSchedulingService.tryScheduleCancellationWorkflow(
            withRenewalWorkflow,
            deps,
          )
        : withRenewalWorkflow;

    const { preferences, rates } =
      await SubscriptionService.getPreferencesAndRates(userId, deps);

    const dto = SubscriptionService.mapToDto(result, preferences, rates);

    await SubscriptionService.logHistoryAction(
      {
        subscriptionId: dto.id,
        userId,
        orgId: effectiveOrgId,
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

    await SubscriptionService.assertCategoryBelongsToSpace(
      userId,
      existing.orgId,
      payload.categoryId,
      deps,
    );

    if (existing.qstashMessageId) {
      await SubscriptionSchedulingService.tryCancelWorkflow(
        existing.qstashMessageId,
        deps,
      );
    }
    if (existing.cancellationQstashMessageId) {
      await SubscriptionSchedulingService.tryCancelCancellationWorkflow(
        existing.cancellationQstashMessageId,
        deps,
      );
    }

    const shouldClearScheduledPriceChange =
      SubscriptionService.shouldClearScheduledPriceChange(existing, payload);

    if (
      shouldClearScheduledPriceChange &&
      existing.priceChangeQstashMessageId
    ) {
      await SubscriptionPriceChangeService.tryCancelPriceChangeWorkflow(
        existing.priceChangeQstashMessageId,
        deps,
      );
    }

    const updated = await deps.repository.update(db, id, {
      ...SubscriptionService.toUpdatePayload(payload),
      qstashMessageId: null,
      cancellationQstashMessageId: null,
      ...(shouldClearScheduledPriceChange
        ? {
            scheduledCost: null,
            scheduledCurrency: null,
            scheduledEffectiveAt: null,
            priceChangeQstashMessageId: null,
          }
        : undefined),
    });

    const withRenewalWorkflow =
      SubscriptionSchedulingService.shouldScheduleWorkflow(updated)
        ? await SubscriptionSchedulingService.tryScheduleWorkflow(updated, deps)
        : updated;
    const result =
      SubscriptionSchedulingService.shouldScheduleCancellationWorkflow(
        withRenewalWorkflow,
      )
        ? await SubscriptionSchedulingService.tryScheduleCancellationWorkflow(
            withRenewalWorkflow,
            deps,
          )
        : withRenewalWorkflow;

    const { preferences, rates } =
      await SubscriptionService.getPreferencesAndRates(userId, deps);

    const previousDto = SubscriptionService.mapToDto(
      existing,
      preferences,
      rates,
    );
    const dto = SubscriptionService.mapToDto(result, preferences, rates);

    if (options.trackHistory !== false) {
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
    }

    return dto;
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
      await SubscriptionSchedulingService.tryCancelWorkflow(
        existing.qstashMessageId,
        deps,
      );
    }
    if (existing.cancellationQstashMessageId) {
      await SubscriptionSchedulingService.tryCancelCancellationWorkflow(
        existing.cancellationQstashMessageId,
        deps,
      );
    }

    if (existing.priceChangeQstashMessageId) {
      await SubscriptionPriceChangeService.tryCancelPriceChangeWorkflow(
        existing.priceChangeQstashMessageId,
        deps,
      );
    }

    let historySnapshot: unknown = existing;

    try {
      const { preferences, rates } =
        await SubscriptionService.getPreferencesAndRates(userId, deps);
      historySnapshot = SubscriptionService.mapToDto(
        existing,
        preferences,
        rates,
      );
    } catch (error) {
      console.error("Failed to prepare delete history snapshot", {
        subscriptionId: id,
        userId,
        error,
      });
    }

    await SubscriptionService.logHistoryAction(
      {
        subscriptionId: id,
        userId,
        orgId: existing.orgId,
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
      qstashMessageId: null,
      cancellationQstashMessageId: null,
      scheduledCost: null,
      scheduledCurrency: null,
      scheduledEffectiveAt: null,
      priceChangeQstashMessageId: null,
    });

    if (existing.qstashMessageId) {
      await SubscriptionSchedulingService.tryCancelWorkflow(
        existing.qstashMessageId,
        deps,
      );
    }
    if (existing.cancellationQstashMessageId) {
      await SubscriptionSchedulingService.tryCancelCancellationWorkflow(
        existing.cancellationQstashMessageId,
        deps,
      );
    }

    if (existing.priceChangeQstashMessageId) {
      await SubscriptionPriceChangeService.tryCancelPriceChangeWorkflow(
        existing.priceChangeQstashMessageId,
        deps,
      );
    }

    const finalRecord =
      SubscriptionSchedulingService.shouldScheduleCancellationWorkflow(updated)
        ? await SubscriptionSchedulingService.tryScheduleCancellationWorkflow(
            updated,
            deps,
          )
        : updated;

    const { preferences, rates } =
      await SubscriptionService.getPreferencesAndRates(userId, deps);

    const dto = SubscriptionService.mapToDto(finalRecord, preferences, rates);

    await SubscriptionService.logHistoryAction(
      {
        subscriptionId: dto.id,
        userId,
        orgId: existing.orgId,
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
          await SubscriptionSchedulingService.tryCancelWorkflow(
            subscription.qstashMessageId,
            deps,
          );
        }
        if (subscription.cancellationQstashMessageId) {
          await SubscriptionSchedulingService.tryCancelCancellationWorkflow(
            subscription.cancellationQstashMessageId,
            deps,
          );
        }

        if (subscription.priceChangeQstashMessageId) {
          await SubscriptionPriceChangeService.tryCancelPriceChangeWorkflow(
            subscription.priceChangeQstashMessageId,
            deps,
          );
        }
      }),
    );

    await deps.repository.deleteByUserId(db, userId);
  }

  static async bulkDeleteSubscriptions(
    userId: string,
    input: BulkDeleteSubscriptionsInput,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<{ deletedCount: number }> {
    const subscriptions = await deps.repository.findManyByIds(db, input.ids);

    const userSubscriptionIds = subscriptions
      .filter((sub) => sub.userId === userId)
      .map((sub) => sub.id);

    if (userSubscriptionIds.length === 0) {
      return { deletedCount: 0 };
    }

    await Promise.all(
      userSubscriptionIds.map(async (id) => {
        const sub = subscriptions.find((s) => s.id === id);
        if (sub?.qstashMessageId) {
          await SubscriptionSchedulingService.tryCancelWorkflow(
            sub.qstashMessageId,
            deps,
          );
        }
        if (sub?.cancellationQstashMessageId) {
          await SubscriptionSchedulingService.tryCancelCancellationWorkflow(
            sub.cancellationQstashMessageId,
            deps,
          );
        }
        if (sub?.priceChangeQstashMessageId) {
          await SubscriptionPriceChangeService.tryCancelPriceChangeWorkflow(
            sub.priceChangeQstashMessageId,
            deps,
          );
        }
      }),
    );

    let prefsAndRates: Awaited<
      ReturnType<typeof this.getPreferencesAndRates>
    > | null = null;
    try {
      prefsAndRates = await SubscriptionService.getPreferencesAndRates(
        userId,
        deps,
      );
    } catch (error) {
      console.error("Failed to prepare delete history snapshots", {
        userId,
        error,
      });
    }

    await Promise.all(
      userSubscriptionIds.map(async (id) => {
        const sub = subscriptions.find((s) => s.id === id);
        const historySnapshot =
          sub && prefsAndRates
            ? SubscriptionService.mapToDto(
                sub,
                prefsAndRates.preferences,
                prefsAndRates.rates,
              )
            : null;

        await SubscriptionService.logHistoryAction(
          {
            subscriptionId: id,
            userId,
            orgId: sub?.orgId,
            action: "deleted",
            snapshot: historySnapshot,
          },
          deps,
        );
      }),
    );

    const deletedCount = await deps.repository.deleteMany(
      db,
      userSubscriptionIds,
    );

    return { deletedCount };
  }

  static async bulkUpdateCategory(
    userId: string,
    input: BulkUpdateCategoryInput,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<{ updatedCount: number }> {
    // For bulk update, we check category ownership in personal space
    // Individual subscriptions already have their orgId set from creation
    await SubscriptionService.assertCategoryBelongsToSpace(
      userId,
      null,
      input.categoryId,
      deps,
    );

    const subscriptions = await deps.repository.findManyByIds(db, input.ids);

    const userSubscriptionIds = subscriptions
      .filter((sub) => sub.userId === userId)
      .map((sub) => sub.id);

    if (userSubscriptionIds.length === 0) {
      return { updatedCount: 0 };
    }

    const updatedCount = await deps.repository.updateCategoryMany(
      db,
      userSubscriptionIds,
      input.categoryId,
    );

    return { updatedCount };
  }

  static mapToDto(
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

    const scheduledPriceChange = SubscriptionService.toScheduledPriceChange(
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
      effectiveAt: SubscriptionService.normalizeDate(
        subscription.scheduledEffectiveAt,
      )!,
      billing,
    };
  }

  private static toInsertPayload(
    userId: string,
    orgId: string | null,
    payload: AddSubscriptionInput,
  ): SubscriptionInsert {
    const willBeCancelledAt = SubscriptionService.normalizeTimestamp(
      payload.willBeCancelledAt,
    );

    return {
      userId,
      orgId,
      ...SubscriptionService.toDbPayload(payload),
      willBeCancelledAt: willBeCancelledAt ?? undefined,
    } as SubscriptionInsert;
  }

  private static toUpdatePayload(
    payload: UpdateSubscriptionInput,
  ): Partial<SubscriptionInsert> {
    const { willBeCancelledAt, ...restPayload } = payload;
    const dbPayload = SubscriptionService.toDbPayload(restPayload);
    const normalizedCancellation =
      SubscriptionService.normalizeTimestamp(willBeCancelledAt);

    if (willBeCancelledAt !== undefined) {
      dbPayload.willBeCancelledAt = normalizedCancellation;
    }

    return SubscriptionService.stripUndefined(dbPayload);
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

  static async getPreferencesAndRates(
    userId: string,
    deps: SubscriptionServiceDeps,
  ): Promise<{ preferences: UserPreferences; rates: Record<string, number> }> {
    const preferences = await deps.userService.getUserPreferences(userId);
    const rates = await deps.currencyService.getRates(
      preferences.preferredCurrency,
    );

    return { preferences, rates };
  }

  private static async assertCategoryBelongsToSpace(
    userId: string,
    orgId: string | null,
    categoryId: string | null | undefined,
    deps: SubscriptionServiceDeps,
  ): Promise<void> {
    if (categoryId === undefined || categoryId === null) {
      return;
    }

    const category = await deps.categoryRepository.findById(db, categoryId);
    if (!category) {
      throw new SubscriptionCategoryNotFoundError();
    }

    // For org space, category must belong to the org
    // For personal space, category must belong to the user (no org)
    if (orgId) {
      if (category.orgId !== orgId) {
        throw new SubscriptionCategoryNotFoundError();
      }
    } else {
      if (category.userId !== userId || category.orgId !== null) {
        throw new SubscriptionCategoryNotFoundError();
      }
    }
  }

  static async logHistoryAction(
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
    deps: SubscriptionServiceDeps,
  ): Promise<void> {
    try {
      const preparedSnapshot =
        action === "updated" &&
        !SubscriptionService.isUpdateDiffSnapshot(snapshot)
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
    const status = params?.status ?? "active";

    let filtered = dtos;

    if (status !== "all") {
      filtered = filtered.filter((dto) => {
        if (status === "active")
          return SubscriptionService.isActiveFilterMatch(dto.status);
        if (status === "cancelled") {
          return dto.status === "cancelled";
        }
        return true;
      });
    }

    if (params?.categoryId) {
      filtered = filtered.filter((dto) => dto.categoryId === params.categoryId);
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

  private static isActiveFilterMatch(
    status: SubscriptionLifecycleStatus,
  ): boolean {
    return status === "active" || status === "cancelledButActive";
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

  static normalizeDate(value?: string | Date | null): string | null {
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
      SubscriptionService.normalizeAmount(nextCost) !==
        SubscriptionService.normalizeAmount(existingCost) ||
      nextCurrency !== existingCurrency
    );
  }

  static normalizeAmount(value: number): string {
    return value.toFixed(2);
  }

  static async getOrgSubscriptions(
    orgId: string,
    userId: string,
    params?: GetSubscriptionsParams,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto[]> {
    const [subscriptions, preferences] = await Promise.all([
      deps.repository.findByOrgId(db, orgId),
      deps.userService.getUserPreferences(userId),
    ]);
    const reconciledSubscriptions =
      await SubscriptionPriceChangeService.reconcileScheduledPriceChanges(
        subscriptions,
        deps,
      );

    const rates = await deps.currencyService.getRates(
      preferences.preferredCurrency,
    );

    const dtos = reconciledSubscriptions.map((subscription) =>
      SubscriptionService.mapToDto(subscription, preferences, rates),
    );

    return SubscriptionService.applyFilters(dtos, params);
  }

  static async deleteAllForOrg(
    orgId: string,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<void> {
    const existing = await deps.repository.findByOrgId(db, orgId);

    await Promise.all(
      existing.map(async (subscription) => {
        if (subscription.qstashMessageId) {
          await SubscriptionSchedulingService.tryCancelWorkflow(
            subscription.qstashMessageId,
            deps,
          );
        }

        if (subscription.priceChangeQstashMessageId) {
          await SubscriptionPriceChangeService.tryCancelPriceChangeWorkflow(
            subscription.priceChangeQstashMessageId,
            deps,
          );
        }
        if (subscription.cancellationQstashMessageId) {
          await SubscriptionSchedulingService.tryCancelCancellationWorkflow(
            subscription.cancellationQstashMessageId,
            deps,
          );
        }
      }),
    );

    await deps.repository.deleteByOrgId(db, orgId);
  }
}
