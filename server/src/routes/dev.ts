import { vValidator } from "@hono/valibot-validator";
import { addDays } from "date-fns";
import { Hono } from "hono";
import { CurrencyUtils, DateTimezoneUtils } from "shared";
import {
  check,
  integer,
  minValue,
  number,
  object,
  pipe,
  string,
} from "valibot";
import { CurrencyService } from "../domains/currency/currencyService";
import { NotificationDeliveryService } from "../domains/notification/notificationDeliveryService";
import { PushNotificationContent } from "../domains/push-notification/pushNotificationContent";
import { PushNotificationService } from "../domains/push-notification/pushNotificationService";
import { SubscriptionService } from "../domains/subscription/subscriptionService";
import { UserService } from "../domains/user/userService";
import { protect } from "../middleware/auth";
import { requireUserId } from "../utils/authUtils";
import { handleServiceError } from "../utils/routeUtils";

const renewalPayloadSchema = object({
  subscriptionId: string(),
  daysUntilPayment: pipe(
    number(),
    check((value) => Number.isFinite(value), "Must be a finite number"),
    integer(),
    minValue(0),
  ),
});

const expiryPayloadSchema = object({
  subscriptionId: string(),
  daysUntilExpiry: pipe(
    number(),
    check((value) => Number.isFinite(value), "Must be a finite number"),
    integer(),
    minValue(0),
  ),
});

const isLocalDevRequest = (requestUrlString: string) => {
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  const requestUrl = new URL(requestUrlString);
  if (
    requestUrl.hostname === "localhost" ||
    requestUrl.hostname === "127.0.0.1"
  ) {
    return true;
  }

  return false;
};

export const devRouter = new Hono()
  .use("*", async (context, next) => {
    if (!isLocalDevRequest(context.req.url)) {
      return context.json({ error: "Not Found" }, 404 as const);
    }

    return await next();
  })
  .post(
    "/notifications/test-renewal",
    protect,
    vValidator("json", renewalPayloadSchema),
    async (context) => {
      const userId = requireUserId(context);

      try {
        const payload = context.req.valid("json");
        const [subscription, preferences] = await Promise.all([
          SubscriptionService.getSubscriptionById(
            payload.subscriptionId,
            userId,
          ),
          UserService.getUserPreferences(userId),
        ]);

        const rates = await CurrencyService.getRates(
          preferences.preferredCurrency,
        );
        const preferredPriceAmount = CurrencyUtils.convert(
          subscription.cost,
          subscription.currency,
          preferences.preferredCurrency,
          rates,
        );
        const now = DateTimezoneUtils.now(preferences.preferredTimezone);
        const paymentDate = addDays(
          now,
          payload.daysUntilPayment,
        ).toISOString();
        const notificationPayload = PushNotificationContent.buildRenewalPayload(
          {
            locale: preferences.locale,
            timezone: preferences.preferredTimezone,
            paymentDate,
            notificationDate: now,
            subscriptionId: subscription.id,
            subscriptionName: subscription.name,
            originalPriceAmount: subscription.cost,
            originalPriceCurrencyCode: subscription.currency,
            preferredPriceAmount,
            preferredPriceCurrencyCode: preferences.preferredCurrency,
            brandDomain: subscription.brandDomain,
          },
        );
        const report = await NotificationDeliveryService.sendNotification(
          userId,
          notificationPayload,
          {
            locale: preferences.locale,
            vapidDetails: PushNotificationService.getVapidDetailsFromEnv(),
          },
        );

        return context.json({ report });
      } catch (error) {
        return handleServiceError(context, error);
      }
    },
  )
  .post(
    "/notifications/test-expiry",
    protect,
    vValidator("json", expiryPayloadSchema),
    async (context) => {
      const userId = requireUserId(context);

      try {
        const payload = context.req.valid("json");
        const [subscription, preferences] = await Promise.all([
          SubscriptionService.getSubscriptionById(
            payload.subscriptionId,
            userId,
          ),
          UserService.getUserPreferences(userId),
        ]);
        const now = DateTimezoneUtils.now(preferences.preferredTimezone);
        const cancellationDate = addDays(
          now,
          payload.daysUntilExpiry,
        ).toISOString();
        const notificationPayload = PushNotificationContent.buildExpiryPayload({
          locale: preferences.locale,
          timezone: preferences.preferredTimezone,
          cancellationDate,
          notificationDate: now,
          subscriptionId: subscription.id,
          subscriptionName: subscription.name,
          brandDomain: subscription.brandDomain,
        });
        const report = await NotificationDeliveryService.sendExpiryNotification(
          userId,
          notificationPayload,
          {
            locale: preferences.locale,
            vapidDetails: PushNotificationService.getVapidDetailsFromEnv(),
          },
        );

        return context.json({ report });
      } catch (error) {
        return handleServiceError(context, error);
      }
    },
  );
