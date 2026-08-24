import type {
  AddSubscriptionInput,
  BulkDeleteSubscriptionsInput,
  BulkUpdateCategoryInput,
  GetSubscriptionsParams,
  PauseSubscriptionInput,
  RenewSubscriptionInput,
  SubscriptionDto,
  UpdateSubscriptionInput,
} from "@subeye/model";
import type { Ports } from "@subeye/store";
import {
  addSubscription,
  cancelSubscription,
  deleteSubscription,
  getSubscription,
  listSubscriptions,
  pauseSubscription,
  renewSubscription,
  resumeSubscription,
  SubscriptionCategoryNotFoundError,
  toSubscriptionDto,
  updateSubscription,
} from "@subeye/store";
import { CategoryRepository } from "../category/categoryRepository";
import { CurrencyService } from "../currency/currencyService";
import {
  createPorts,
  toPricePhaseRecord,
  toSubscriptionRecord,
} from "../ports";
import { UserService } from "../user/userService";
import { SubscriptionPricePhaseRepository } from "./subscriptionPricePhaseRepository";
import { SubscriptionRepository } from "./subscriptionRepository";

/**
 * The transport-side adapter over `@subeye/store`. Every rule lives in the
 * store; what is left here is the tenant (supplied through `createPorts`) and
 * the paged list read, whose filtering and ordering stay in SQL.
 */
export class SubscriptionService {
  /**
   * The full, unfiltered mapped list. Used by analytics, which needs every
   * subscription regardless of status.
   */
  static async getSubscriptions(
    userId: string,
    ports: Ports = createPorts(userId),
  ): Promise<SubscriptionDto[]> {
    return listSubscriptions(ports);
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
  ): Promise<{ items: SubscriptionDto[]; nextCursor: string | null }> {
    const search = params.search?.trim().toLowerCase();
    const sortBy = params.sortBy ?? "nextPaymentDate";
    const direction = params.direction ?? "asc";

    const preferences = await UserService.getUserPreferences(userId);
    const { rows, nextCursor } = await SubscriptionRepository.findPageByUserId({
      userId,
      search: search && search.length > 0 ? search : undefined,
      status: params.status ?? "active",
      categoryId: params.categoryId,
      sortBy,
      direction,
      cursor: params.cursor,
      limit: params.limit ?? 50,
    });

    const [rates, phases, categories] = await Promise.all([
      CurrencyService.getRates(preferences.preferredCurrency),
      SubscriptionPricePhaseRepository.findBySubscriptionIds(
        rows.map((row) => row.id),
        userId,
      ),
      CategoryRepository.findByUserId(userId),
    ]);

    const phasesBySubscription = new Map<
      string,
      ReturnType<typeof toPricePhaseRecord>[]
    >();
    for (const phase of phases) {
      const list = phasesBySubscription.get(phase.subscriptionId) ?? [];
      list.push(toPricePhaseRecord(phase));
      phasesBySubscription.set(phase.subscriptionId, list);
    }

    const categoriesById = new Map(
      categories.map((category) => [
        category.id,
        { id: category.id, name: category.name, emoji: category.emoji },
      ]),
    );

    const now = new Date();
    const items = rows
      .map((row) =>
        toSubscriptionDto(
          toSubscriptionRecord(row),
          phasesBySubscription.get(row.id) ?? [],
          preferences,
          rates,
          row.categoryId ? (categoriesById.get(row.categoryId) ?? null) : null,
          now,
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
    ports: Ports = createPorts(userId),
  ): Promise<SubscriptionDto> {
    return getSubscription(ports, id);
  }

  static async addSubscription(
    userId: string,
    payload: AddSubscriptionInput,
    ports: Ports = createPorts(userId),
  ): Promise<SubscriptionDto> {
    return addSubscription(ports, payload);
  }

  static async updateSubscription(
    id: string,
    userId: string,
    payload: UpdateSubscriptionInput,
    ports: Ports = createPorts(userId),
  ): Promise<SubscriptionDto> {
    return updateSubscription(ports, id, payload);
  }

  static async deleteSubscription(
    id: string,
    userId: string,
    ports: Ports = createPorts(userId),
  ): Promise<void> {
    return deleteSubscription(ports, id);
  }

  /** Cancel at the end of the current paid period (access kept until then). */
  static async cancelSubscription(
    id: string,
    userId: string,
    ports: Ports = createPorts(userId),
  ): Promise<SubscriptionDto> {
    return cancelSubscription(ports, id, "periodEnd");
  }

  /** Cancel right away — access ends now. */
  static async cancelSubscriptionImmediately(
    id: string,
    userId: string,
    ports: Ports = createPorts(userId),
  ): Promise<SubscriptionDto> {
    return cancelSubscription(ports, id, "immediate");
  }

  static async renewSubscription(
    id: string,
    userId: string,
    payload: RenewSubscriptionInput = { paymentDate: null },
    ports: Ports = createPorts(userId),
  ): Promise<SubscriptionDto> {
    return renewSubscription(ports, id, payload.paymentDate ?? null);
  }

  static async pauseSubscription(
    id: string,
    userId: string,
    payload: PauseSubscriptionInput,
    ports: Ports = createPorts(userId),
  ): Promise<SubscriptionDto> {
    return pauseSubscription(ports, id, payload.resumeAt ?? null);
  }

  static async resumeSubscription(
    id: string,
    userId: string,
    ports: Ports = createPorts(userId),
  ): Promise<SubscriptionDto> {
    return resumeSubscription(ports, id);
  }

  /**
   * Account deletion, from the Clerk `user.deleted` webhook. The price phases
   * go with the rows — `subscription_price_phases` is `ON DELETE CASCADE`.
   */
  static async deleteAllForUser(userId: string): Promise<void> {
    await SubscriptionRepository.deleteByUserId(userId);
  }

  static async bulkDeleteSubscriptions(
    userId: string,
    input: BulkDeleteSubscriptionsInput,
  ): Promise<{ deletedCount: number }> {
    const owned = (await SubscriptionRepository.findManyByIds(input.ids))
      .filter((subscription) => subscription.userId === userId)
      .map((subscription) => subscription.id);

    if (owned.length === 0) return { deletedCount: 0 };

    return { deletedCount: await SubscriptionRepository.deleteMany(owned) };
  }

  static async bulkUpdateCategory(
    userId: string,
    input: BulkUpdateCategoryInput,
    ports: Ports = createPorts(userId),
  ): Promise<{ updatedCount: number }> {
    if (input.categoryId && !(await ports.categories.byId(input.categoryId))) {
      throw new SubscriptionCategoryNotFoundError();
    }

    const owned = (await SubscriptionRepository.findManyByIds(input.ids))
      .filter((subscription) => subscription.userId === userId)
      .map((subscription) => subscription.id);

    if (owned.length === 0) return { updatedCount: 0 };

    return {
      updatedCount: await SubscriptionRepository.updateCategoryMany(
        owned,
        input.categoryId,
      ),
    };
  }
}
