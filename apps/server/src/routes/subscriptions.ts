import { vValidator } from "@hono/valibot-validator";
import {
  AddIntroDiscountSchema,
  AddSubscriptionSchema,
  BulkDeleteSubscriptionsSchema,
  BulkUpdateCategorySchema,
  CancelSubscriptionSchema,
  idQuerySchema,
  listQuerySchema,
  SchedulePriceChangeSchema,
  StartTrialSchema,
  UpdateSubscriptionSchema,
  updateSubscriptionQuerySchema,
} from "@subeye/shared";
import { Hono } from "hono";
import { object, string } from "valibot";
import { SubscriptionHistoryService } from "../domains/subscription/subscriptionHistoryService";
import { SubscriptionPhaseService } from "../domains/subscription/subscriptionPhaseService";
import { SubscriptionService } from "../domains/subscription/subscriptionService";
import { protect } from "../middleware/auth";
import { getOrgId, requireUserId } from "../utils/authUtils";
import { handleServiceError } from "../utils/routeUtils";

const historyIdParamSchema = object({
  id: string(),
  historyId: string(),
});

const phaseIdParamSchema = object({
  id: string(),
  phaseId: string(),
});

export const subscriptionRouter = new Hono()
  .get("/", protect, vValidator("query", listQuerySchema), async (context) => {
    const userId = requireUserId(context);
    const orgId = getOrgId(context);

    try {
      const params = context.req.valid("query");
      const subscriptions = orgId
        ? await SubscriptionService.getOrgSubscriptions(orgId, userId, params)
        : await SubscriptionService.getSubscriptions(userId, params);
      return context.json(subscriptions);
    } catch (error) {
      return handleServiceError(context, error);
    }
  })
  .post(
    "/batch/delete",
    protect,
    vValidator("json", BulkDeleteSubscriptionsSchema),
    async (context) => {
      const userId = requireUserId(context);

      try {
        const payload = context.req.valid("json");
        const result = await SubscriptionService.bulkDeleteSubscriptions(
          userId,
          payload,
        );
        return context.json(result);
      } catch (error) {
        return handleServiceError(context, error);
      }
    },
  )
  .post(
    "/batch/category",
    protect,
    vValidator("json", BulkUpdateCategorySchema),
    async (context) => {
      const userId = requireUserId(context);

      try {
        const payload = context.req.valid("json");
        const result = await SubscriptionService.bulkUpdateCategory(
          userId,
          payload,
        );
        return context.json(result);
      } catch (error) {
        return handleServiceError(context, error);
      }
    },
  )
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
      const orgId = getOrgId(context);

      try {
        const payload = context.req.valid("json");
        const subscription = await SubscriptionService.addSubscription(
          userId,
          payload,
          orgId,
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
    "/:id/trial",
    protect,
    vValidator("param", idQuerySchema),
    vValidator("json", StartTrialSchema),
    async (context) => {
      const userId = requireUserId(context);

      try {
        const { id } = context.req.valid("param");
        const payload = context.req.valid("json");
        const subscription = await SubscriptionPhaseService.startTrial(
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
    "/:id/intro-discount",
    protect,
    vValidator("param", idQuerySchema),
    vValidator("json", AddIntroDiscountSchema),
    async (context) => {
      const userId = requireUserId(context);

      try {
        const { id } = context.req.valid("param");
        const payload = context.req.valid("json");
        const subscription = await SubscriptionPhaseService.addIntroDiscount(
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
    "/:id/phases/schedule-change",
    protect,
    vValidator("param", idQuerySchema),
    vValidator("json", SchedulePriceChangeSchema),
    async (context) => {
      const userId = requireUserId(context);

      try {
        const { id } = context.req.valid("param");
        const payload = context.req.valid("json");
        const subscription = await SubscriptionPhaseService.schedulePriceChange(
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
    "/:id/phases/:phaseId",
    protect,
    vValidator("param", phaseIdParamSchema),
    async (context) => {
      const userId = requireUserId(context);

      try {
        const { id, phaseId } = context.req.valid("param");
        const subscription = await SubscriptionPhaseService.cancelPhase(
          id,
          userId,
          phaseId,
        );
        return context.json(subscription);
      } catch (error) {
        return handleServiceError(context, error);
      }
    },
  )
  .post(
    "/:id/phases/:phaseId/apply-now",
    protect,
    vValidator("param", phaseIdParamSchema),
    async (context) => {
      const userId = requireUserId(context);

      try {
        const { id, phaseId } = context.req.valid("param");
        const subscription = await SubscriptionPhaseService.applyPhaseNow(
          id,
          userId,
          phaseId,
        );
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
    vValidator("json", CancelSubscriptionSchema),
    async (context) => {
      const userId = requireUserId(context);

      try {
        const { id } = context.req.valid("param");
        const { mode } = context.req.valid("json");
        const subscription =
          mode === "immediate"
            ? await SubscriptionService.cancelSubscriptionImmediately(
                id,
                userId,
              )
            : await SubscriptionService.cancelSubscription(id, userId);
        return context.json(subscription);
      } catch (error) {
        return handleServiceError(context, error);
      }
    },
  )
  .post(
    "/:id/renew",
    protect,
    vValidator("param", idQuerySchema),
    async (context) => {
      const userId = requireUserId(context);

      try {
        const { id } = context.req.valid("param");
        const subscription = await SubscriptionService.renewSubscription(
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
  });
