import { buildPhaseProjection, toStartOfUtcDay } from "@subeye/pricing";
import type {
  AddSubscriptionInput,
  BulkDeleteSubscriptionsInput,
  BulkUpdateCategoryInput,
  GetSubscriptionsParams,
  PauseSubscriptionInput,
  RenewSubscriptionInput,
  SubscriptionDto,
  SubscriptionPeriod,
  SubscriptionStatus,
  UpdateSubscriptionInput,
  UserPreferences,
} from "@subeye/shared";
import {
  DateTimezoneUtils,
  deriveSubscriptionStatus,
  RecurrenceUtils,
} from "@subeye/shared";
import { SubscriptionCalculator } from "@subeye/spend";
import { CategoryRepository } from "../category/categoryRepository";
import { CurrencyService } from "../currency/currencyService";
import { UserService } from "../user/userService";
import {
  AlreadyPausedError,
  NotPausedError,
  ScheduledDateMustBeFutureError,
  SubscriptionCategoryNotFoundError,
  SubscriptionNotFoundError,
} from "./subscriptionErrors";
import type { EmbeddedCategory } from "./subscriptionMapper";
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
  /**
   * The full, unfiltered mapped list. Used by analytics, which needs every
   * subscription regardless of status. The filtered/paged list read is
   * `getSubscriptionsPage`, which pushes filtering into SQL.
   */
  static async getSubscriptions(
    userId: string,
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

    return subscriptions.map((subscription) =>
      SubscriptionService.mapToDto(
        subscription,
        preferences,
        rates,
        phasesById.get(subscription.id) ?? [],
      ),
    );
  }

  /**
   * Paged list read. Filtering, sorting and pagination happen in SQL; the page
   * is then re-sorted with the converted amounts and the computed next payment
   * dates, which SQL cannot produce. Ordering is exact within a page and
   * approximate across pages (see `findPageByUserId`).
   */
  static async getSubscriptionsPage(
    userId: string,
    params: GetSubscriptionsParams,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<{ items: SubscriptionDto[]; nextCursor: string | null }> {
    const search = params.search?.trim().toLowerCase();
    const sortBy = params.sortBy ?? "nextPaymentDate";
    const direction = params.direction ?? "asc";

    const preferences = await deps.userService.getUserPreferences(userId);
    const { rows, nextCursor } = await deps.repository.findPageByUserId({
      userId,
      search: search && search.length > 0 ? search : undefined,
      status: params.status ?? "active",
      categoryId: params.categoryId,
      sortBy,
      direction,
      cursor: params.cursor,
      limit: params.limit ?? 50,
    });

    const [rates, phasesById, categories] = await Promise.all([
      deps.currencyService.getRates(preferences.preferredCurrency),
      SubscriptionPhaseService.loadPhasesFor(
        rows.map((row) => row.id),
        deps,
      ),
      deps.categoryRepository.findByUserId(userId),
    ]);

    const categoriesById = new Map(
      categories.map((category) => [
        category.id,
        { id: category.id, name: category.name, emoji: category.emoji },
      ]),
    );

    const items = rows
      .map((row) =>
        SubscriptionService.mapToDto(
          row,
          preferences,
          rates,
          phasesById.get(row.id) ?? [],
          row.categoryId ? (categoriesById.get(row.categoryId) ?? null) : null,
        ),
      )
      .sort((a, b) => {
        const multiplier = direction === "asc" ? 1 : -1;
        if (sortBy === "name") return a.name.localeCompare(b.name) * multiplier;
        if (sortBy === "cost") {
          return (
            (a.billing.preferred.monthly - b.billing.preferred.monthly) *
            multiplier
          );
        }
        return (
          (Date.parse(a.nextPaymentDate) - Date.parse(b.nextPaymentDate)) *
          multiplier
        );
      });

    return { items, nextCursor };
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
    const [rates, phases, category] = await Promise.all([
      deps.currencyService.getRates(preferences.preferredCurrency),
      deps.phaseRepository.findBySubscriptionId(id),
      subscription.categoryId
        ? deps.categoryRepository.findById(subscription.categoryId)
        : null,
    ]);

    return SubscriptionService.mapToDto(
      subscription,
      preferences,
      rates,
      phases,
      category
        ? { id: category.id, name: category.name, emoji: category.emoji }
        : null,
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
    // The offer boundary is floored to the UTC day — the same flooring
    // startPhase applies — so "ends later today" must be rejected here, not
    // after the insert.
    const { intro, ...createPayload } = payload;
    const { preferences, rates } =
      await SubscriptionService.getPreferencesAndRates(userId, deps);

    const introEndsAt = intro ? toStartOfUtcDay(intro.endsAt) : null;
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
      return SubscriptionPhaseService.startPhase(
        result.id,
        userId,
        {
          kind: intro.kind,
          promoCost: intro.promoCost,
          currency: result.currency,
          endsAt: introEndsAt,
          standardCost: Number(result.cost),
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
    // The user's calendar DAY, not `new Date()`. `cancelled_at` is a day value
    // everywhere else — the client renders it in UTC and `shouldIncludeOccurrence`
    // compares it against day-valued occurrences — and west of UTC a raw
    // instant lands on tomorrow's UTC day, so an evening "cancel now" read as
    // still cancelling until the following morning.
    const willBeCancelledAt =
      mode === "immediate"
        ? DateTimezoneUtils.currentCalendarDay(
            new Date(),
            userPreferences.preferredTimezone,
          )
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
      status: SubscriptionService.currentStatus(
        { ...existing, willBeCancelledAt },
        userPreferences.preferredTimezone,
      ),
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

  /**
   * Resume a cancelling/cancelled subscription (clears the cancellation).
   *
   * `paymentDate` re-anchors the billing cycle to the day the subscription
   * actually started again. Every future occurrence is projected FROM that
   * anchor (`getNextOccurrence`), so renewing a long-dead monthly subscription
   * without it would keep billing on the old day-of-month and immediately
   * project a payment that already passed.
   *
   * It is optional because the two renewable states want different things: a
   * still-billing `cancelling` subscription never stopped, so moving its anchor
   * would shift a cycle that was never interrupted. Only an ENDED one is asked
   * for a date.
   *
   * Renewing also clears any pause. A paused subscription is offered `cancel`,
   * and a cancelled one is offered `renew`, so the pause columns outlive the
   * cancellation they were buried under — left in place they return the
   * restarted subscription to an indefinite pause, which drops every future
   * occurrence from spend. Renew means live again; nothing else can clear them
   * from here, because `resume` is not offered on a cancelled subscription.
   */
  static async renewSubscription(
    id: string,
    userId: string,
    payload: RenewSubscriptionInput = { paymentDate: null },
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto> {
    const existing = await deps.repository.findById(id);

    if (!existing || existing.userId !== userId) {
      throw new SubscriptionNotFoundError();
    }

    const updated = await deps.repository.update(id, {
      willBeCancelledAt: null,
      pausedAt: null,
      resumeAt: null,
      status: "active",
      ...(payload.paymentDate ? { paymentDate: payload.paymentDate } : {}),
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

  /**
   * Pause billing. Spend is skipped per occurrence from `pausedAt` until
   * `resumeAt` (exclusive); an omitted `resumeAt` pauses indefinitely.
   */
  static async pauseSubscription(
    id: string,
    userId: string,
    payload: PauseSubscriptionInput,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto> {
    const existing = await deps.repository.findById(id);
    if (!existing || existing.userId !== userId) {
      throw new SubscriptionNotFoundError();
    }

    // Loaded BEFORE the guard, not after: the guard and the DTO's `status` must
    // answer "is this paused" in the same calendar, or for a few hours around a
    // resume date the list advertises `pause` and this throws AlreadyPaused.
    const { preferences, rates } =
      await SubscriptionService.getPreferencesAndRates(userId, deps);

    if (
      SubscriptionService.currentStatus(
        existing,
        preferences.preferredTimezone,
      ) === "paused"
    ) {
      throw new AlreadyPausedError();
    }

    const updated = await deps.repository.update(id, {
      status: "paused",
      pausedAt: new Date().toISOString(),
      resumeAt: payload.resumeAt ?? null,
    });

    const phases = await deps.phaseRepository.findBySubscriptionId(id);

    return SubscriptionService.mapToDto(updated, preferences, rates, phases);
  }

  /**
   * Resume billing: clear the pause and roll `payment_date` forward to the next
   * occurrence in the future. Without the roll-forward the anchor still points
   * at a date inside the pause and the dashboard shows a charge that never
   * happened.
   */
  static async resumeSubscription(
    id: string,
    userId: string,
    deps: SubscriptionServiceDeps = defaultDeps,
  ): Promise<SubscriptionDto> {
    const existing = await deps.repository.findById(id);
    if (!existing || existing.userId !== userId) {
      throw new SubscriptionNotFoundError();
    }
    // Before the guard, for the same reason as `pauseSubscription`.
    const preferences = await deps.userService.getUserPreferences(userId);

    if (
      SubscriptionService.currentStatus(
        existing,
        preferences.preferredTimezone,
      ) !== "paused"
    ) {
      throw new NotPausedError();
    }

    const nextOccurrence = RecurrenceUtils.getNextOccurrence(
      DateTimezoneUtils.toCalendarDay(existing.paymentDate),
      existing.every,
      existing.period as SubscriptionPeriod,
      DateTimezoneUtils.currentCalendarDay(
        new Date(),
        preferences.preferredTimezone,
      ),
    );

    const updated = await deps.repository.update(id, {
      status: "active",
      pausedAt: null,
      resumeAt: null,
      paymentDate: new Date(nextOccurrence.getTime()).toISOString(),
    });

    const rates = await deps.currencyService.getRates(
      preferences.preferredCurrency,
    );
    const phases = await deps.phaseRepository.findBySubscriptionId(id);

    return SubscriptionService.mapToDto(updated, preferences, rates, phases);
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
      preferences.preferredTimezone,
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

  /**
   * The status the row's date columns say it has right now. Every lifecycle
   * guard reads this rather than `record.status`, which is a cache the client
   * never sees: the DTO derives its status on read, so a dated pause whose
   * `resume_at` has elapsed reads `active` everywhere while the column still
   * says `paused`, and a guard on the column refuses an action the same row
   * advertises in `allowedActions`.
   */
  private static currentStatus(
    record: {
      willBeCancelledAt: Date | string | null;
      pausedAt: string | null;
      resumeAt: string | null;
    },
    timezone?: string,
  ): SubscriptionStatus {
    return deriveSubscriptionStatus(
      {
        willBeCancelledAt: SubscriptionService.normalizeDate(
          record.willBeCancelledAt,
        ),
        pausedAt: record.pausedAt,
        resumeAt: record.resumeAt,
      },
      new Date(),
      timezone,
    );
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
