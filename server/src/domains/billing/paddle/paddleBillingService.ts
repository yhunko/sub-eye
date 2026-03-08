import { clerkClient } from "@clerk/express";
import { db } from "../../../db";
import { UserService } from "../../user/userService";
import { BillingAccountRepository } from "./billingAccountRepository";
import { BillingWebhookEventRepository } from "./billingWebhookEventRepository";
import { PaddleApiClient } from "./paddleApiClient";
import type {
  PaddlePrice,
  PaddleSubscriptionStatus,
  PaddleWebhookEvent,
} from "./paddleTypes";
import type {
  BillingCheckoutResponse,
  BillingPortalResponse,
  PlanId,
} from "shared";

const PAID_PLUS_STATUSES = new Set<PaddleSubscriptionStatus>([
  "trialing",
  "active",
  "past_due",
]);
const FREE_STATUSES = new Set<PaddleSubscriptionStatus>([
  "paused",
  "canceled",
  "inactive",
]);

const PRICE_CACHE_TTL_MS = 5 * 60 * 1000;

type PaddleBillingDeps = {
  apiClient: typeof PaddleApiClient;
  billingAccountRepository: typeof BillingAccountRepository;
  billingWebhookEventRepository: typeof BillingWebhookEventRepository;
  userService: typeof UserService;
};

const defaultDeps: PaddleBillingDeps = {
  apiClient: PaddleApiClient,
  billingAccountRepository: BillingAccountRepository,
  billingWebhookEventRepository: BillingWebhookEventRepository,
  userService: UserService,
};

export class PaddleBillingService {
  private static plusPriceCache: {
    productId: string;
    priceId: string;
    expiresAt: number;
  } | null = null;

  static async createCheckoutTransaction(
    userId: string,
    deps: PaddleBillingDeps = defaultDeps,
  ): Promise<BillingCheckoutResponse> {
    const billingAccount = await deps.billingAccountRepository.findByUserId(
      db,
      userId,
    );
    const priceId = await this.getPlusPriceId(deps);
    const paddleCustomerId = billingAccount?.paddleCustomerId ?? undefined;

    const transaction = await deps.apiClient.createTransaction({
      customerId: paddleCustomerId,
      priceId,
      customData: {
        userId,
        planId: "plus",
      },
    });

    const billingAccountPatch: {
      userId: string;
      paddlePriceId: string;
      paddleCustomerId?: string;
    } = {
      userId,
      paddlePriceId: priceId,
    };

    if (paddleCustomerId) {
      billingAccountPatch.paddleCustomerId = paddleCustomerId;
    }

    await deps.billingAccountRepository.upsertByUserId(db, billingAccountPatch);

    return { transactionId: transaction.id };
  }

  static async createCustomerPortalUrl(
    userId: string,
    deps: PaddleBillingDeps = defaultDeps,
  ): Promise<BillingPortalResponse> {
    const customerId = await this.getOrCreateCustomerId(userId, deps);
    const portalSession =
      await deps.apiClient.createCustomerPortalSession(customerId);

    const url = portalSession.urls?.general?.overview;

    if (!url) {
      throw new Error("Failed to create Paddle customer portal URL");
    }

    return { url };
  }

  static async processWebhookEvent(
    event: PaddleWebhookEvent,
    deps: PaddleBillingDeps = defaultDeps,
  ): Promise<void> {
    const isFirstProcessing =
      await deps.billingWebhookEventRepository.markProcessed(db, {
        eventId: event.event_id,
        eventType: event.event_type,
        occurredAt: event.occurred_at,
        eventPayload: event,
      });

    if (!isFirstProcessing) {
      return;
    }

    const resolvedContext = await this.resolveEventContext(event, deps);

    if (!resolvedContext.userId) {
      console.warn("[Paddle Webhook] Unable to resolve user for event", {
        eventId: event.event_id,
        eventType: event.event_type,
      });
      return;
    }

    if (
      this.isEventOlderThanLatest(
        event.occurred_at,
        resolvedContext.billingAccount?.lastEventOccurredAt,
      )
    ) {
      return;
    }

    const billingPatch = this.extractBillingPatchFromEvent(event);

    const billingAccount = await deps.billingAccountRepository.upsertByUserId(
      db,
      {
        userId: resolvedContext.userId,
        paddleCustomerId:
          billingPatch.paddleCustomerId ??
          resolvedContext.billingAccount?.paddleCustomerId,
        paddleSubscriptionId:
          billingPatch.paddleSubscriptionId ??
          resolvedContext.billingAccount?.paddleSubscriptionId,
        paddleSubscriptionStatus:
          billingPatch.paddleSubscriptionStatus ??
          resolvedContext.billingAccount?.paddleSubscriptionStatus,
        paddlePriceId:
          billingPatch.paddlePriceId ??
          resolvedContext.billingAccount?.paddlePriceId,
        paddleCurrentPeriodEnd:
          billingPatch.paddleCurrentPeriodEnd ??
          resolvedContext.billingAccount?.paddleCurrentPeriodEnd,
        lastEventOccurredAt: event.occurred_at,
      },
    );

    const planId = this.resolvePlanIdForEvent(
      event.event_type,
      billingAccount.paddleSubscriptionStatus,
      billingAccount.paddleSubscriptionId,
    );

    if (planId) {
      await deps.userService.setPlanId(resolvedContext.userId, planId);
    }
  }

  private static async resolveEventContext(
    event: PaddleWebhookEvent,
    deps: PaddleBillingDeps,
  ): Promise<{
    userId: string | null;
    billingAccount: Awaited<
      ReturnType<typeof BillingAccountRepository.findByUserId>
    >;
  }> {
    const userIdFromCustomData = this.extractUserIdFromEvent(event);

    if (userIdFromCustomData) {
      const billingAccount = await deps.billingAccountRepository.findByUserId(
        db,
        userIdFromCustomData,
      );
      return { userId: userIdFromCustomData, billingAccount };
    }

    const customerId = this.extractCustomerId(event);

    if (customerId) {
      const billingAccount =
        await deps.billingAccountRepository.findByPaddleCustomerId(
          db,
          customerId,
        );

      if (billingAccount) {
        return { userId: billingAccount.userId, billingAccount };
      }
    }

    const subscriptionId = this.extractSubscriptionId(event);

    if (subscriptionId) {
      const billingAccount =
        await deps.billingAccountRepository.findByPaddleSubscriptionId(
          db,
          subscriptionId,
        );

      if (billingAccount) {
        return { userId: billingAccount.userId, billingAccount };
      }
    }

    return { userId: null, billingAccount: null };
  }

  private static extractBillingPatchFromEvent(event: PaddleWebhookEvent): {
    paddleCustomerId?: string;
    paddleSubscriptionId?: string;
    paddleSubscriptionStatus?: string;
    paddlePriceId?: string;
    paddleCurrentPeriodEnd?: string;
  } {
    const customerId = this.extractCustomerId(event);
    const subscriptionId = this.extractSubscriptionId(event);
    const status = this.extractSubscriptionStatus(event);
    const priceId = this.extractPriceId(event);
    const currentPeriodEnd = this.extractCurrentPeriodEnd(event);

    return {
      ...(customerId ? { paddleCustomerId: customerId } : undefined),
      ...(subscriptionId
        ? { paddleSubscriptionId: subscriptionId }
        : undefined),
      ...(status ? { paddleSubscriptionStatus: status } : undefined),
      ...(priceId ? { paddlePriceId: priceId } : undefined),
      ...(currentPeriodEnd
        ? { paddleCurrentPeriodEnd: currentPeriodEnd }
        : undefined),
    };
  }

  private static extractUserIdFromEvent(
    event: PaddleWebhookEvent,
  ): string | null {
    const customData = this.getObject(event.data, "custom_data");

    if (!customData) {
      return null;
    }

    const userId =
      this.getString(customData, "userId") ??
      this.getString(customData, "user_id");

    return userId ?? null;
  }

  private static extractCustomerId(event: PaddleWebhookEvent): string | null {
    const directCustomerId = this.getString(event.data, "customer_id");

    if (directCustomerId) {
      return directCustomerId;
    }

    const customer = this.getObject(event.data, "customer");
    return customer ? this.getString(customer, "id") : null;
  }

  private static extractSubscriptionId(
    event: PaddleWebhookEvent,
  ): string | null {
    if (event.event_type.startsWith("subscription.")) {
      return this.getString(event.data, "id");
    }

    const directSubscriptionId = this.getString(event.data, "subscription_id");

    if (directSubscriptionId) {
      return directSubscriptionId;
    }

    const subscription = this.getObject(event.data, "subscription");
    return subscription ? this.getString(subscription, "id") : null;
  }

  private static extractSubscriptionStatus(
    event: PaddleWebhookEvent,
  ): PaddleSubscriptionStatus | null {
    if (event.event_type === "transaction.completed") {
      return this.extractSubscriptionId(event) ? "active" : null;
    }

    if (event.event_type === "transaction.payment_failed") {
      return this.extractSubscriptionId(event) ? "past_due" : null;
    }

    const status = this.getString(event.data, "status");
    return status ?? null;
  }

  private static extractPriceId(event: PaddleWebhookEvent): string | null {
    const items = this.getArray(event.data, "items");

    if (!items.length) {
      return null;
    }

    const firstItem = items[0];

    if (!firstItem || typeof firstItem !== "object") {
      return null;
    }

    const directPriceId = this.getString(
      firstItem as Record<string, unknown>,
      "price_id",
    );

    if (directPriceId) {
      return directPriceId;
    }

    const price = this.getObject(firstItem as Record<string, unknown>, "price");
    return price ? this.getString(price, "id") : null;
  }

  private static extractCurrentPeriodEnd(
    event: PaddleWebhookEvent,
  ): string | null {
    const currentPeriod = this.getObject(event.data, "current_billing_period");

    if (currentPeriod) {
      const value = this.getString(currentPeriod, "ends_at");
      if (value) {
        return value;
      }
    }

    const subscription = this.getObject(event.data, "subscription");
    if (!subscription) {
      return null;
    }

    const nestedCurrentPeriod = this.getObject(
      subscription,
      "current_billing_period",
    );
    return nestedCurrentPeriod
      ? this.getString(nestedCurrentPeriod, "ends_at")
      : null;
  }

  private static resolvePlanIdForEvent(
    eventType: string,
    status: string | null,
    subscriptionId: string | null,
  ): PlanId | null {
    if (eventType === "transaction.completed") {
      return subscriptionId ? "plus" : null;
    }

    if (eventType === "transaction.payment_failed") {
      return subscriptionId ? "plus" : null;
    }

    if (!eventType.startsWith("subscription.")) {
      return null;
    }

    if (!status) {
      return null;
    }

    if (PAID_PLUS_STATUSES.has(status)) {
      return "plus";
    }

    if (FREE_STATUSES.has(status)) {
      return "free";
    }

    return null;
  }

  private static async getOrCreateCustomerId(
    userId: string,
    deps: PaddleBillingDeps,
  ): Promise<string> {
    const billingAccount = await deps.billingAccountRepository.findByUserId(
      db,
      userId,
    );

    if (billingAccount?.paddleCustomerId) {
      return billingAccount.paddleCustomerId;
    }

    const user = await clerkClient.users.getUser(userId);

    const email = user.primaryEmailAddress?.emailAddress;

    if (!email) {
      throw new Error("User email is required to create Paddle customer");
    }

    const fullName = user.fullName?.trim();
    const customer = await deps.apiClient.createCustomer({
      email,
      ...(fullName ? { name: fullName } : undefined),
    });

    await deps.billingAccountRepository.upsertByUserId(db, {
      userId,
      paddleCustomerId: customer.id,
    });

    return customer.id;
  }

  private static async getPlusPriceId(
    deps: PaddleBillingDeps,
  ): Promise<string> {
    const productId = this.getPlusProductId();

    if (
      this.plusPriceCache &&
      this.plusPriceCache.productId === productId &&
      this.plusPriceCache.expiresAt > Date.now()
    ) {
      return this.plusPriceCache.priceId;
    }

    const prices = await deps.apiClient.listActivePrices();
    const productPrices = prices.filter((price) =>
      this.priceBelongsToProduct(price, productId),
    );

    if (!productPrices.length) {
      throw new Error(`No active Paddle prices found for product ${productId}`);
    }

    const recurringPrices = productPrices.filter(
      (price) => this.extractInterval(price) !== null,
    );

    if (!recurringPrices.length) {
      throw new Error(
        `No active recurring Paddle prices found for product ${productId}`,
      );
    }

    const monthlyRecurringPrice =
      recurringPrices.find(
        (price) => this.extractInterval(price) === "month",
      ) ?? recurringPrices[0];

    if (!monthlyRecurringPrice?.id) {
      throw new Error(
        `Failed to resolve Paddle price for product ${productId}`,
      );
    }

    this.plusPriceCache = {
      productId,
      priceId: monthlyRecurringPrice.id,
      expiresAt: Date.now() + PRICE_CACHE_TTL_MS,
    };

    return monthlyRecurringPrice.id;
  }

  private static getPlusProductId(): string {
    const value = process.env.PADDLE_PLUS_PRODUCT_ID?.trim();

    if (!value) {
      throw new Error("PADDLE_PLUS_PRODUCT_ID is required");
    }

    if (!value.startsWith("pro_")) {
      throw new Error("PADDLE_PLUS_PRODUCT_ID must be a Paddle product ID");
    }

    return value;
  }

  private static isEventOlderThanLatest(
    eventOccurredAt: string,
    latestOccurredAt?: string | null,
  ): boolean {
    if (!latestOccurredAt) {
      return false;
    }

    const eventTime = Date.parse(eventOccurredAt);
    const latestTime = Date.parse(latestOccurredAt);

    if (Number.isNaN(eventTime) || Number.isNaN(latestTime)) {
      return false;
    }

    return eventTime < latestTime;
  }

  private static priceBelongsToProduct(
    price: PaddlePrice,
    productId: string,
  ): boolean {
    const priceProductId =
      price.productId ?? price.product_id ?? price.product?.id;

    return priceProductId === productId;
  }

  private static extractInterval(price: PaddlePrice): string | null {
    return (
      price.billingCycle?.interval ?? price.billing_cycle?.interval ?? null
    );
  }

  private static getString(
    value: Record<string, unknown>,
    key: string,
  ): string | null {
    const result = value[key];
    return typeof result === "string" ? result : null;
  }

  private static getObject(
    value: Record<string, unknown>,
    key: string,
  ): Record<string, unknown> | null {
    const result = value[key];
    return result && typeof result === "object" && !Array.isArray(result)
      ? (result as Record<string, unknown>)
      : null;
  }

  private static getArray(
    value: Record<string, unknown>,
    key: string,
  ): unknown[] {
    const result = value[key];
    return Array.isArray(result) ? result : [];
  }
}
