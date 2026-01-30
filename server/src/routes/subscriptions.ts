import type { Context } from "hono";
import { Hono } from "hono";
import { vValidator } from "@hono/valibot-validator";
import { object, string } from "valibot";
import {
  AddSubscriptionSchema,
  UpdateSubscriptionSchema,
} from "@shared/schemas/subscriptionSchemas";
import { listQuerySchema } from "@shared/domains/subscription";
import { SubscriptionService } from "../domains/subscription/subscriptionService";
import { SubscriptionWorkflow } from "../domains/subscription/subscriptionWorkflow";
import { requireUserId } from "../utils/authUtils";
import { protect } from "../middleware/auth";

const idParamSchema = object({
  id: string(),
});

const handleServiceError = (context: Context, error: unknown) => {
  if (error instanceof Error) {
    if (error.message === "Subscription not found") {
      return context.json({ error: error.message }, 404);
    }
  }

  return context.json({ error: "Internal Server Error" }, 500);
};

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
  .get("/:id", protect, vValidator("param", idParamSchema), async (context) => {
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
    vValidator("param", idParamSchema),
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
  .delete(
    "/:id",
    protect,
    vValidator("param", idParamSchema),
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
  .post("/workflow", protect, SubscriptionWorkflow.handler);
