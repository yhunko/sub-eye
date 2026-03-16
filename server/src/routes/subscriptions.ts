import { Hono } from "hono";
import { vValidator } from "@hono/valibot-validator";
import { object, string } from "valibot";
import {
  AddSubscriptionSchema,
  SchedulePriceChangeSchema,
  UpdateSubscriptionSchema,
  idQuerySchema,
  listQuerySchema,
  updateSubscriptionQuerySchema,
} from "shared";
import { SubscriptionService } from "../domains/subscription/subscriptionService";
import { SubscriptionNotificationsWorkflow } from "../domains/subscription/subscriptionNotificationsWorkflow";
import { SubscriptionPriceChangeWorkflow } from "../domains/subscription/subscriptionPriceChangeWorkflow";
import { requireUserId } from "../utils/authUtils";
import { protect } from "../middleware/auth";
import { SubscriptionHistoryService } from "../domains/subscription/subscriptionHistoryService";
import { handleServiceError } from "../utils/routeUtils";

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
    vValidator("query", updateSubscriptionQuerySchema),
    vValidator("json", UpdateSubscriptionSchema),
    async (context) => {
      const userId = requireUserId(context);

      try {
        const { id } = context.req.valid("param");
        const query = context.req.valid("query");
        const payload = context.req.valid("json");
        const subscription = await SubscriptionService.updateSubscription(
          id,
          userId,
          payload,
          {
            trackHistory: query.trackHistory !== "false",
          },
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
