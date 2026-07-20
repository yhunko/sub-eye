import { buildPhaseProjection, toStartOfDayInTimezone } from "@subeye/pricing";
import type {
  AddSubscriptionInput,
  BulkDeleteSubscriptionsInput,
  BulkUpdateCategoryInput,
  GetSubscriptionsParams,
  SubscriptionDto,
  SubscriptionStatus,
  UpdateSubscriptionInput,
  UserPreferences,
} from "@subeye/shared";
import { SubscriptionCalculator } from "@subeye/spend";
import { CategoryRepository } from "../category/categoryRepository";
import { CurrencyService } from "../currency/currencyService";
import { UserService } from "../user/userService";
import {
  ScheduledDateMustBeFutureError,
  SubscriptionCategoryNotFoundError,
  SubscriptionNotFoundError,
} from "./subscriptionErrors";
import { SubscriptionMapper } from "./subscriptionMapper";
import { SubscriptionPhaseService } from "./subscriptionPhaseService";
import type { PricePhaseRecord } from "./subscriptionPricePhaseRepository";
import { SubscriptionPricePhaseRepository } from "./subscriptionPricePhaseRepository";
import type {
  SubscriptionInsert,
  SubscriptionRecord,
} from "./subscriptionRepository";
import { SubscriptionRepository } from "./subscriptionRepository";

export type SubscriptionServiceDeps = {
  repository: typeof SubscriptionRepository;
  phaseRepository: typeof SubscriptionPricePhaseRepository;
  currencyService: typeof CurrencyService;
  userService: typeof UserService;
  categoryRepository: typeof CategoryRepository;
};

type CancellationMode = "periodEnd" | "immediate";

export const defaultDeps: SubscriptionServiceDeps = {
  repository: SubscriptionRepository,
  phaseRepository: SubscriptionPricePhaseRepository,
  currencyService: CurrencyService,
  userService: UserService,
  categoryRepository: CategoryRepository,
};

export class SubscriptionService {
  static async getSubscriptions(
    userId: string,
    params?: GetSubscriptionsParams,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto[]> {
    const [subscriptions, preferences] = await Promise.all([
      deps.repository.findByUserId(userId),
      deps.userService.getUserPreferences(userId),
    ]);

    const [rates, phasesById] = await Promise.all([
      deps.currencyService.getRates(preferences.preferredCurrency),
      SubscriptionPhaseService.loadPhasesFor(
        subscriptions.map((s) => s.id),
        deps,
      ),
    ]);

    const dtos = subscriptions.map((subscription) =>
      SubscriptionService.mapToDto(
        subscription,
        preferences,
        rates,
        phasesById.get(subscription.id) ?? [],
      ),
    );

    return SubscriptionService.applyFilters(dtos, params);
  }

  static async getSubscriptionById(
    id: string,
    userId: string,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto> {
    const existing = await deps.repository.findById(id);
    if (!existing || existing.userId !== userId) {
      throw new SubscriptionNotFoundError();
    }

    // Lazy write-on-read, scoped to ONE subscription: if a phase boundary has
    // passed, apply it now so the row and the timeline agree. This is the only
    // read that may write, and only when there is genuinely something due.
    await SubscriptionPhaseService.applyDuePhases(id, deps);

    const subscription = (await deps.repository.findById(id)) ?? existing;
    const preferences = await deps.userService.getUserPreferences(userId);
    const [rates, phases] = await Promise.all([
      deps.currencyService.getRates(preferences.preferredCurrency),
      deps.phaseRepository.findBySubscriptionId(id),
    ]);

    return SubscriptionService.mapToDto(
      subscription,
      preferences,
      rates,
      phases,
    );
  }

  static async addSubscription(
    userId: string,
    payload: AddSubscriptionInput,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto> {
    await SubscriptionService.assertCategoryBelongsToUser(
      userId,
      payload.categoryId,
      deps,
    );

    // Validate the starting offer before any write. `neon-http` has no
    // interactive transactions, so a late throw leaves an orphan row behind.
    // The offer boundary is floored to midnight in the USER'S timezone — the
    // same flooring startTrial/addIntroDiscount apply — so "ends later today"
    // must be rejected here, not after the insert.
    const { intro, ...createPayload } = payload;
    const { preferences, rates } =
      await SubscriptionService.getPreferencesAndRates(userId, deps);

    const introEndsAt = intro
      ? toStartOfDayInTimezone(intro.endsAt, preferences.preferredTimezone)
      : null;
    if (introEndsAt && Date.parse(introEndsAt) <= Date.now()) {
      throw new ScheduledDateMustBeFutureError();
    }

    const created = await deps.repository.create(
      SubscriptionService.toInsertPayload(userId, createPayload),
    );

    const result = created;

    const dto = SubscriptionService.mapToDto(result, preferences, rates, []);

    // Start the subscription on its trial / intro offer (the standard price is
    // the cost just created). Returns the DTO with the resulting price phases.
    if (intro && introEndsAt) {
      const standardCost = Number(result.cost);
      if (intro.kind === "trial") {
        return SubscriptionPhaseService.startTrial(
          result.id,
          userId,
          {
            trialCost: intro.promoCost,
            trialCurrency: result.currency,
            endsAt: introEndsAt,
            standardCost,
            standardCurrency: result.currency,
          },
          deps,
        );
      }
      return SubscriptionPhaseService.addIntroDiscount(
        result.id,
        userId,
        {
          introCost: intro.promoCost,
          introCurrency: result.currency,
          endsAt: intro.endsAt,
          standardCost,
          standardCurrency: result.currency,
        },
        deps,
      );
    }

    return dto;
  }

  static async updateSubscription(
    id: string,
    userId: string,
    payload: UpdateSubscriptionInput,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto> {
    const existing = await deps.repository.findById(id);

    if (!existing || existing.userId !== userId) {
      throw new SubscriptionNotFoundError();
    }

    await SubscriptionService.assertCategoryBelongsToUser(
      userId,
      payload.categoryId,
      deps,
    );

    // A direct price/currency edit supersedes any pending pricing schedule.
    if (SubscriptionService.isDirectPriceChange(existing, payload)) {
      await SubscriptionPhaseService.clearPendingPhases(id, deps);
    }

    const updated = await deps.repository.update(id, {
      ...SubscriptionService.toUpdatePayload(payload),
    });

    const result = updated;

    const { preferences, rates } =
      await SubscriptionService.getPreferencesAndRates(userId, deps);

    const phasesAfter = await deps.phaseRepository.findBySubscriptionId(id);

    return SubscriptionService.mapToDto(
      result,
      preferences,
      rates,
      phasesAfter,
    );
  }

  static async deleteSubscription(
    id: string,
    userId: string,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<void> {
    const existing = await deps.repository.findById(id);

    if (!existing || existing.userId !== userId) {
      throw new SubscriptionNotFoundError();
    }

    await SubscriptionPhaseService.clearPendingPhases(id, deps);

    await deps.repository.delete(id);
  }

  /** Cancel at the end of the current paid period (access kept until then). */
  static async cancelSubscription(
    id: string,
    userId: string,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto> {
    return SubscriptionService.applyCancellation(id, userId, "periodEnd", deps);
  }

  /** Cancel right away — access ends now. */
  static async cancelSubscriptionImmediately(
    id: string,
    userId: string,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto> {
    return SubscriptionService.applyCancellation(id, userId, "immediate", deps);
  }

  private static async applyCancellation(
    id: string,
    userId: string,
    mode: CancellationMode,
    deps: SubscriptionServiceDeps,
  ): Promise<SubscriptionDto> {
    const existing = await deps.repository.findById(id);

    if (!existing || existing.userId !== userId) {
      throw new SubscriptionNotFoundError();
    }

    const userPreferences = await deps.userService.getUserPreferences(userId);
    const willBeCancelledAt =
      mode === "immediate"
        ? new Date()
        : new Date(
            SubscriptionCalculator.calculatePaymentDates(
              existing,
              userPreferences.preferredTimezone,
            ).nextPaymentDate,
          );

    // Cancelling does NOT delete the pending pricing schedule: nothing fires it
    // automatically any more, and keeping the rows is what lets renew restore
    // the real reversion price instead of stranding the user on the trial cost.
    const updated = await deps.repository.update(id, {
      willBeCancelledAt,
    });

    const finalRecord = updated;

    const { preferences, rates } =
      await SubscriptionService.getPreferencesAndRates(userId, deps);
    const phases = await deps.phaseRepository.findBySubscriptionId(id);

    return SubscriptionService.mapToDto(
      finalRecord,
      preferences,
      rates,
      phases,
    );
  }

  /** Resume a cancelling/cancelled subscription (clears the cancellation). */
  static async renewSubscription(
    id: string,
    userId: string,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto> {
    const existing = await deps.repository.findById(id);

    if (!existing || existing.userId !== userId) {
      throw new SubscriptionNotFoundError();
    }

    const updated = await deps.repository.update(id, {
      willBeCancelledAt: null,
    });

    const withRenewalWorkflow = updated;

    const phases = await deps.phaseRepository.findBySubscriptionId(id);
    const { preferences, rates } =
      await SubscriptionService.getPreferencesAndRates(userId, deps);
    return SubscriptionService.mapToDto(
      withRenewalWorkflow,
      preferences,
      rates,
      phases,
    );
  }

  static async deleteAllForUser(
    userId: string,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<void> {
    const existing = await deps.repository.findByUserId(userId);

    await Promise.all(
      existing.map(async (subscription) => {
        await SubscriptionPhaseService.clearPendingPhases(
          subscription.id,
          deps,
        );
      }),
    );

    await deps.repository.deleteByUserId(userId);
  }

  static async bulkDeleteSubscriptions(
    userId: string,
    input: BulkDeleteSubscriptionsInput,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<{ deletedCount: number }> {
    const subscriptions = await deps.repository.findManyByIds(input.ids);

    const userSubscriptionIds = subscriptions
      .filter((sub) => sub.userId === userId)
      .map((sub) => sub.id);

    if (userSubscriptionIds.length === 0) {
      return { deletedCount: 0 };
    }

    await Promise.all(
      userSubscriptionIds.map(async (id) => {
        const sub = subscriptions.find((s) => s.id === id);
        if (sub) {
          await SubscriptionPhaseService.clearPendingPhases(sub.id, deps);
        }
      }),
    );

    const deletedCount = await deps.repository.deleteMany(userSubscriptionIds);

    return { deletedCount };
  }

  static async bulkUpdateCategory(
    userId: string,
    input: BulkUpdateCategoryInput,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<{ updatedCount: number }> {
    await SubscriptionService.assertCategoryBelongsToUser(
      userId,
      input.categoryId,
      deps,
    );

    const subscriptions = await deps.repository.findManyByIds(input.ids);

    const userSubscriptionIds = subscriptions
      .filter((sub) => sub.userId === userId)
      .map((sub) => sub.id);

    if (userSubscriptionIds.length === 0) {
      return { updatedCount: 0 };
    }

    const updatedCount = await deps.repository.updateCategoryMany(
      userSubscriptionIds,
      input.categoryId,
    );

    return { updatedCount };
  }

  static mapToDto(
    subscription: SubscriptionRecord,
    preferences: UserPreferences,
    rates: Record<string, number>,
    phases: PricePhaseRecord[] = [],
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

  private static toInsertPayload(
    userId: string,
    payload: AddSubscriptionInput,
  ): SubscriptionInsert {
    const willBeCancelledAt = SubscriptionService.normalizeTimestamp(
      payload.willBeCancelledAt,
    );

    return {
      userId,
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

  private static async assertCategoryBelongsToUser(
    userId: string,
    categoryId: string | null | undefined,
    deps: SubscriptionServiceDeps,
  ): Promise<void> {
    if (categoryId === undefined || categoryId === null) {
      return;
    }

    const category = await deps.categoryRepository.findById(categoryId);
    if (!category) {
      throw new SubscriptionCategoryNotFoundError();
    }

    if (category.userId !== userId) {
      throw new SubscriptionCategoryNotFoundError();
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

  private static isActiveFilterMatch(status: SubscriptionStatus): boolean {
    return status === "active" || status === "cancelling";
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

  private static isDirectPriceChange(
    subscription: SubscriptionRecord,
    payload: UpdateSubscriptionInput,
  ): boolean {
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
}
