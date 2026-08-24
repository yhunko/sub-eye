import { vValidator } from "@hono/valibot-validator";
import {
  AddSubscriptionSchema,
  BulkDeleteSubscriptionsSchema,
  BulkUpdateCategorySchema,
  CancelSubscriptionSchema,
  idQuerySchema,
  listQuerySchema,
  PauseSubscriptionSchema,
  RenewSubscriptionSchema,
  StartPhaseSchema,
  UpdateSubscriptionSchema,
} from "@subeye/model";
import { Hono } from "hono";
import { object, string } from "valibot";
import { SubscriptionPhaseService } from "../domains/subscription/subscriptionPhaseService";
import { SubscriptionService } from "../domains/subscription/subscriptionService";
import { protect } from "../middleware/auth";
import { requireUserId } from "../utils/authUtils";
import { handleServiceError, onInvalid } from "../utils/routeUtils";

const phaseIdParamSchema = object({
  id: string(),
  phaseId: string(),
});

export const subscriptionRouter = new Hono()
  .get(
    "/",
    protect,
    vValidator("query", listQuerySchema, onInvalid),
    async (context) => {
      const userId = requireUserId(context);

      try {
        const params = context.req.valid("query");
        const page = await SubscriptionService.getSubscriptionsPage(userId, {
          ...params,
          limit: params.limit ? Number(params.limit) : undefined,
        });
        return context.json(page);
      } catch (error) {
        return handleServiceError(context, error);
      }
    },
  )
  .post(
    "/batch/delete",
    protect,
    vValidator("json", BulkDeleteSubscriptionsSchema, onInvalid),
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
    vValidator("json", BulkUpdateCategorySchema, onInvalid),
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
  .get(
    "/:id",
    protect,
    vValidator("param", idQuerySchema, onInvalid),
    async (context) => {
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
    },
  )
  .post(
    "/",
    protect,
    vValidator("json", AddSubscriptionSchema, onInvalid),
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
    vValidator("param", idQuerySchema, onInvalid),
    vValidator("json", UpdateSubscriptionSchema, onInvalid),
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
    "/:id/phases",
    protect,
    vValidator("param", idQuerySchema, onInvalid),
    vValidator("json", StartPhaseSchema, onInvalid),
    async (context) => {
      const userId = requireUserId(context);

      try {
        const { id } = context.req.valid("param");
        const payload = context.req.valid("json");
        const subscription = await SubscriptionPhaseService.startPhase(
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
    vValidator("param", phaseIdParamSchema, onInvalid),
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
    vValidator("param", phaseIdParamSchema, onInvalid),
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
    vValidator("param", idQuerySchema, onInvalid),
    vValidator("json", CancelSubscriptionSchema, onInvalid),
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
    vValidator("param", idQuerySchema, onInvalid),
    vValidator("json", RenewSubscriptionSchema, onInvalid),
    async (context) => {
      const userId = requireUserId(context);

      try {
        const { id } = context.req.valid("param");
        const subscription = await SubscriptionService.renewSubscription(
          id,
          userId,
          context.req.valid("json"),
        );
        return context.json(subscription);
      } catch (error) {
        return handleServiceError(context, error);
      }
    },
  )
  .post(
    "/:id/pause",
    protect,
    vValidator("param", idQuerySchema, onInvalid),
    vValidator("json", PauseSubscriptionSchema, onInvalid),
    async (context) => {
      const userId = requireUserId(context);

      try {
        const { id } = context.req.valid("param");
        const payload = context.req.valid("json");
        const subscription = await SubscriptionService.pauseSubscription(
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
    "/:id/resume",
    protect,
    vValidator("param", idQuerySchema, onInvalid),
    async (context) => {
      const userId = requireUserId(context);

      try {
        const { id } = context.req.valid("param");
        const subscription = await SubscriptionService.resumeSubscription(
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
    vValidator("param", idQuerySchema, onInvalid),
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
  );
