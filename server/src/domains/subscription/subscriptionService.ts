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
import { UserService } from "../user/userService";
import type {
  AddSubscriptionInput,
  SubscriptionDto,
  UpdateSubscriptionInput,
  GetSubscriptionsParams,
} from "@shared/domains/subscription";
import type { UserPreferences } from "@shared/types";
import { FREE_PLAN } from "@shared/domains/billing";

type SubscriptionServiceDeps = {
  repository: typeof SubscriptionRepository;
  currencyService: typeof CurrencyService;
  workflow: typeof SubscriptionNotificationsWorkflow;
  userService: typeof UserService;
};

const defaultDeps: SubscriptionServiceDeps = {
  repository: SubscriptionRepository,
  currencyService: CurrencyService,
  workflow: SubscriptionNotificationsWorkflow,
  userService: UserService,
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

    const rates = await deps.currencyService.getRates(
      preferences.preferredCurrency,
    );

    const dtos = subscriptions.map((subscription) =>
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

    const preferences = await deps.userService.getUserPreferences(userId);
    const rates = await deps.currencyService.getRates(
      preferences.preferredCurrency,
    );

    return this.mapToDto(subscription, preferences, rates);
  }

  static async addSubscription(
    userId: string,
    payload: AddSubscriptionInput,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto> {
    const currentCount = await deps.repository.countByUserId(db, userId);
    if (currentCount >= FREE_PLAN.limits.maxSubscriptions) {
      throw new Error("Subscription limit reached");
    }

    const created = await deps.repository.create(
      db,
      this.toInsertPayload(userId, payload),
    );

    const result = created.cancelledAt
      ? created
      : await this.scheduleWorkflow(created, deps);

    const { preferences, rates } = await this.getPreferencesAndRates(
      userId,
      deps,
    );

    return this.mapToDto(result, preferences, rates);
  }

  static async updateSubscription(
    id: string,
    userId: string,
    payload: UpdateSubscriptionInput,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto> {
    const existing = await deps.repository.findById(db, id);

    if (!existing || existing.userId !== userId) {
      throw new Error("Subscription not found");
    }

    if (existing.qstashMessageId) {
      await deps.workflow.cancel(existing.qstashMessageId);
    }

    const updated = await deps.repository.update(
      db,
      id,
      this.toUpdatePayload(payload),
    );

    const result = updated.cancelledAt
      ? updated
      : await this.scheduleWorkflow(updated, deps);

    const { preferences, rates } = await this.getPreferencesAndRates(
      userId,
      deps,
    );

    return this.mapToDto(result, preferences, rates);
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
      await deps.workflow.cancel(existing.qstashMessageId);
    }

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

    const updated = await deps.repository.update(db, id, {
      cancelledAt: new Date(),
      qstashMessageId: null,
    });

    if (existing.qstashMessageId) {
      await deps.workflow.cancel(existing.qstashMessageId);
    }

    const { preferences, rates } = await this.getPreferencesAndRates(
      userId,
      deps,
    );

    return this.mapToDto(updated, preferences, rates);
  }

  static async deleteAllForUser(
    userId: string,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<void> {
    const existing = await deps.repository.findByUserId(db, userId);

    await Promise.all(
      existing.map((subscription) =>
        subscription.qstashMessageId
          ? deps.workflow.cancel(subscription.qstashMessageId)
          : Promise.resolve(),
      ),
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
          await deps.workflow.cancel(subscription.qstashMessageId);
        }
        if (!subscription.cancelledAt) {
          await this.scheduleWorkflow(subscription, deps);
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

    return SubscriptionMapper.toDto(
      subscription,
      billing,
      nextPaymentDate,
      lastPaymentDate,
    );
  }

  private static toInsertPayload(
    userId: string,
    payload: AddSubscriptionInput,
  ): SubscriptionInsert {
    return {
      userId,
      ...this.toDbPayload(payload),
      cancelledAt: payload.isCancelled ? new Date() : undefined,
    } as SubscriptionInsert;
  }

  private static toUpdatePayload(
    payload: UpdateSubscriptionInput,
  ): Partial<SubscriptionInsert> {
    const { isCancelled, ...restPayload } = payload;
    const dbPayload = this.toDbPayload(restPayload);

    if (isCancelled !== undefined) {
      dbPayload.cancelledAt = isCancelled ? new Date() : null;
    }

    return this.stripUndefined(dbPayload);
  }

  private static toDbPayload(
    payload: AddSubscriptionInput | UpdateSubscriptionInput,
  ): Partial<SubscriptionInsert> {
    return {
      ...payload,
      cost: payload.cost !== undefined ? payload.cost.toString() : undefined,
      paymentDate:
        payload.paymentDate !== undefined
          ? new Date(payload.paymentDate).toISOString()
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
        const isCancelled = !!dto.cancelledAt;
        if (status === "active") return !isCancelled;
        if (status === "cancelled") return isCancelled;
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
}
