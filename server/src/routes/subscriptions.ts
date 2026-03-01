import type { Context } from "hono";
import { Hono } from "hono";
import { vValidator } from "@hono/valibot-validator";
import { object, string } from "valibot";
import {
  AddSubscriptionSchema,
  SchedulePriceChangeSchema,
  UpdateSubscriptionSchema,
  idQuerySchema,
  listQuerySchema,
} from "shared";
import { SubscriptionService } from "../domains/subscription/subscriptionService";
import { SubscriptionNotificationsWorkflow } from "../domains/subscription/subscriptionNotificationsWorkflow";
import { SubscriptionPriceChangeWorkflow } from "../domains/subscription/subscriptionPriceChangeWorkflow";
import { requireUserId } from "../utils/authUtils";
import { protect } from "../middleware/auth";
import { SubscriptionHistoryService } from "../domains/subscription/subscriptionHistoryService";

const knownServiceErrorStatuses: Record<string, 403 | 404> = {
  "Subscription not found": 404,
  "Subscription history item not found": 404,
  "Subscription limit reached": 403,
};

const badRequestServiceErrors = new Set<string>([
  "Custom date is required for custom-date mode",
  "Cannot schedule a price change for a cancelled subscription",
  "Invalid scheduled effective date",
  "Scheduled effective date must be in the future",
  "Scheduled effective date must be before the cancellation date",
  "No scheduled price change",
]);

const handleServiceError = (context: Context, error: unknown) => {
  if (error instanceof Error) {
    const mappedStatus = knownServiceErrorStatuses[error.message];
    if (mappedStatus) {
      return context.json({ error: error.message }, mappedStatus);
    }
    if (badRequestServiceErrors.has(error.message)) {
      return context.json(
        { error: "Database Error", message: error.message },
        400,
      );
    }
    return context.json(
      { error: "Database Error", message: error.message },
      500,
    );
  }

  return context.json({ error: "Internal Server Error" }, 500);
};

const historyIdParamSchema = object({
  id: string(),
  historyId: string(),
});

export const subscriptionRouter = new Hono()
  .get("/", protect, vValidator("query", listQuerySchema), async (context) => {
    const userId = requireUserId(context);

    try {
      const params = context.req.valid("query");
      const subscriptions = await SubscriptionService.getSubscriptions(
        userId,
        params,
      );
      return context.json(subscriptions);
    } catch (error) {
      return handleServiceError(context, error);
    }
  })
  .get("/:id", protect, vValidator("param", idQuerySchema), async (context) => {
    const userId = requireUserId(context);

    try {
      const { id } = context.req.valid("param");
      const subscription = await SubscriptionService.getSubscriptionById(
        id,
        userId,
      );
      return context.json(subscription);
    } catch (error) {
      return handleServiceError(context, error);
    }
  })
  .get(
    "/:id/history",
    protect,
    vValidator("param", idQuerySchema),
    async (context) => {
      const userId = requireUserId(context);

      try {
        const { id } = context.req.valid("param");
        const historyData =
          await SubscriptionHistoryService.getHistoryForSubscription(
            id,
            userId,
          );
        return context.json(historyData);
      } catch (error) {
        return handleServiceError(context, error);
      }
    },
  )
  .delete(
    "/:id/history/:historyId",
    protect,
    vValidator("param", historyIdParamSchema),
    async (context) => {
      const userId = requireUserId(context);

      try {
        const { id, historyId } = context.req.valid("param");
        await SubscriptionHistoryService.deleteHistoryItem({
          subscriptionId: id,
          historyId,
          userId,
        });

        return context.json({ success: true });
      } catch (error) {
        return handleServiceError(context, error);
      }
    },
  )
  .post(
    "/",
    protect,
    vValidator("json", AddSubscriptionSchema),
    async (context) => {
      const userId = requireUserId(context);

      try {
        const payload = context.req.valid("json");
        const subscription = await SubscriptionService.addSubscription(
          userId,
          payload,
        );
        return context.json(subscription, 201);
      } catch (error) {
        return handleServiceError(context, error);
      }
    },
  )
  .patch(
    "/:id",
    protect,
    vValidator("param", idQuerySchema),
    vValidator("json", UpdateSubscriptionSchema),
    async (context) => {
      const userId = requireUserId(context);

      try {
        const { id } = context.req.valid("param");
        const payload = context.req.valid("json");
        const subscription = await SubscriptionService.updateSubscription(
          id,
          userId,
          payload,
        );
        return context.json(subscription);
      } catch (error) {
        return handleServiceError(context, error);
      }
    },
  )
  .post(
    "/:id/price-change/schedule",
    protect,
    vValidator("param", idQuerySchema),
    vValidator("json", SchedulePriceChangeSchema),
    async (context) => {
      const userId = requireUserId(context);

      try {
        const { id } = context.req.valid("param");
        const payload = context.req.valid("json");
        const subscription = await SubscriptionService.schedulePriceChange(
          id,
          userId,
          payload,
        );
        return context.json(subscription);
      } catch (error) {
        return handleServiceError(context, error);
      }
    },
  )
  .delete(
    "/:id/price-change/schedule",
    protect,
    vValidator("param", idQuerySchema),
    async (context) => {
      const userId = requireUserId(context);

      try {
        const { id } = context.req.valid("param");
        const subscription =
          await SubscriptionService.cancelScheduledPriceChange(id, userId);
        return context.json(subscription);
      } catch (error) {
        return handleServiceError(context, error);
      }
    },
  )
  .post(
    "/:id/price-change/apply-now",
    protect,
    vValidator("param", idQuerySchema),
    async (context) => {
      const userId = requireUserId(context);

      try {
        const { id } = context.req.valid("param");
        const subscription =
          await SubscriptionService.applyScheduledPriceChangeNow(id, userId);
        return context.json(subscription);
      } catch (error) {
        return handleServiceError(context, error);
      }
    },
  )
  .post(
    "/:id/cancel",
    protect,
    vValidator("param", idQuerySchema),
    async (context) => {
      const userId = requireUserId(context);

      try {
        const { id } = context.req.valid("param");
        const subscription = await SubscriptionService.cancelSubscription(
          id,
          userId,
        );
        return context.json(subscription);
      } catch (error) {
        return handleServiceError(context, error);
      }
    },
  )
  .delete(
    "/:id",
    protect,
    vValidator("param", idQuerySchema),
    async (context) => {
      const userId = requireUserId(context);

      try {
        const { id } = context.req.valid("param");
        await SubscriptionService.deleteSubscription(id, userId);
        return context.json({ success: true });
      } catch (error) {
        return handleServiceError(context, error);
      }
    },
  )
  .delete("/", protect, async (context) => {
    const userId = requireUserId(context);

    try {
      await SubscriptionService.deleteAllForUser(userId);
      return context.json({ success: true });
    } catch (error) {
      return handleServiceError(context, error);
    }
  })
  .post("/notifications/workflow", SubscriptionNotificationsWorkflow.handler)
  .post("/price-change/workflow", SubscriptionPriceChangeWorkflow.handler);
