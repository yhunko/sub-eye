import { db } from "../../db";
import { SubscriptionHistoryRepository } from "./subscriptionHistoryRepository";
import { SubscriptionRepository } from "./subscriptionRepository";
import { UserService } from "../user/userService";
import {
  FREE_SUBSCRIPTION_HISTORY_LIMIT,
  type SubscriptionAction,
  type SubscriptionHistoryDto,
} from "shared";
import {
  SubscriptionHistoryItemNotFoundError,
  SubscriptionNotFoundError,
} from "./subscriptionErrors";

type SubscriptionHistoryServiceDeps = {
  repository: typeof SubscriptionHistoryRepository;
  subscriptionRepository: typeof SubscriptionRepository;
  userService: typeof UserService;
};

const defaultDeps: SubscriptionHistoryServiceDeps = {
  repository: SubscriptionHistoryRepository,
  subscriptionRepository: SubscriptionRepository,
  userService: UserService,
};

export class SubscriptionHistoryService {
  static async logAction(
    subscriptionId: string | null,
    userId: string,
    action: SubscriptionAction,
    snapshot: unknown,
    orgId: string | null = null,
    deps: SubscriptionHistoryServiceDeps = defaultDeps,
  ): Promise<void> {
    await deps.repository.insert(db, {
      subscriptionId,
      userId,
      orgId,
      action,
      snapshot,
    });
  }

  static async getHistoryForSubscription(
    subscriptionId: string,
    userId: string,
    deps: SubscriptionHistoryServiceDeps = defaultDeps,
  ): Promise<{ history: SubscriptionHistoryDto[]; hasMore: boolean }> {
    const subscription = await deps.subscriptionRepository.findById(
      db,
      subscriptionId,
    );

    if (!subscription || subscription.userId !== userId) {
      throw new SubscriptionNotFoundError();
    }

    const planId = await deps.userService.getPlanId(userId);
    const limit =
      planId === "plus" ? undefined : FREE_SUBSCRIPTION_HISTORY_LIMIT;

    const records = await deps.repository.findBySubscriptionId(
      db,
      { subscriptionId, userId },
      limit ? limit + 1 : undefined,
    );

    const hasMore = limit !== undefined && records.length > limit;
    const itemsToReturn = hasMore ? records.slice(0, limit) : records;

    const history = itemsToReturn.map((record) => ({
      id: record.id,
      subscriptionId: record.subscriptionId,
      userId: record.userId,
      action: record.action,
      snapshot: record.snapshot,
      createdAt: record.createdAt.toISOString(),
    }));

    return { history, hasMore };
  }

  static async deleteHistoryItem(
    {
      subscriptionId,
      historyId,
      userId,
    }: {
      subscriptionId: string;
      historyId: string;
      userId: string;
    },
    deps: SubscriptionHistoryServiceDeps = defaultDeps,
  ): Promise<void> {
    const subscription = await deps.subscriptionRepository.findById(
      db,
      subscriptionId,
    );

    if (!subscription || subscription.userId !== userId) {
      throw new SubscriptionNotFoundError();
    }

    const deleted = await deps.repository.deleteById(db, {
      historyId,
      subscriptionId,
      userId,
    });

    if (!deleted) {
      throw new SubscriptionHistoryItemNotFoundError();
    }
  }
}
