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
} from "@shared/domains/subscription/subscriptionSchemas";
import type { GetSubscriptionsParams } from "@shared/domains/subscription";
import type { UserPreferences } from "@shared/types";

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
    const created = await deps.repository.create(
      db,
      this.toInsertPayload(userId, payload),
    );
    const scheduled = await this.scheduleWorkflow(created, deps);
    const { preferences, rates } = await this.getPreferencesAndRates(
      userId,
      deps,
    );

    return this.mapToDto(scheduled, preferences, rates);
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
    const scheduled = await this.scheduleWorkflow(updated, deps);
    const { preferences, rates } = await this.getPreferencesAndRates(
      userId,
      deps,
    );

    return this.mapToDto(scheduled, preferences, rates);
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
    } as SubscriptionInsert;
  }

  private static toUpdatePayload(
    payload: UpdateSubscriptionInput,
  ): Partial<SubscriptionInsert> {
    return this.stripUndefined(this.toDbPayload(payload));
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

    const filtered = search
      ? dtos.filter((dto) => dto.name.toLowerCase().includes(search))
      : dtos;

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
