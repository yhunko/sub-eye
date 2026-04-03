import { vValidator } from "@hono/valibot-validator";
import { Hono } from "hono";
import {
  UpdateTelegramMessageTemplateSchema,
  UpdateTelegramNotificationPreferencesSchema,
} from "shared";
import {
  TELEGRAM_TEMPLATE_NOT_LINKED_ERROR,
  TELEGRAM_TEMPLATE_PLUS_REQUIRED_ERROR,
  TelegramNotificationService,
} from "../domains/telegram-notification/telegramNotificationService";
import { protect } from "../middleware/auth";
import { requireUserId } from "../utils/authUtils";

export const telegramNotificationRouter = new Hono()
  .get("/status", protect, async (context) => {
    const userId = requireUserId(context);
    const status = await TelegramNotificationService.getStatus(userId);

    return context.json(status);
  })
  .post("/link/start", protect, async (context) => {
    const userId = requireUserId(context);

    try {
      const response =
        await TelegramNotificationService.createLinkStart(userId);
      return context.json(response);
    } catch (error) {
      return context.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to start telegram linking",
        },
        500,
      );
    }
  })
  .patch(
    "/preferences",
    protect,
    vValidator("json", UpdateTelegramNotificationPreferencesSchema),
    async (context) => {
      const userId = requireUserId(context);
      const { enabled } = context.req.valid("json");
      const status = await TelegramNotificationService.updatePreferences(
        userId,
        enabled,
      );

      return context.json(status);
    },
  )
  .patch(
    "/template",
    protect,
    vValidator("json", UpdateTelegramMessageTemplateSchema),
    async (context) => {
      const userId = requireUserId(context);
      const { messageTemplate } = context.req.valid("json");

      try {
        const status = await TelegramNotificationService.updateMessageTemplate(
          userId,
          messageTemplate,
        );

        return context.json(status);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === TELEGRAM_TEMPLATE_PLUS_REQUIRED_ERROR
        ) {
          return context.json({ error: error.message }, 403);
        }

        if (
          error instanceof Error &&
          (error.message === TELEGRAM_TEMPLATE_NOT_LINKED_ERROR ||
            error.message.startsWith("Unsupported template variables:"))
        ) {
          return context.json({ error: error.message }, 400);
        }

        return context.json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Failed to update telegram message template",
          },
          500,
        );
      }
    },
  )
  .post("/disconnect", protect, async (context) => {
    const userId = requireUserId(context);
    await TelegramNotificationService.disconnectByUserId(userId);

    return context.json({ success: true });
  })
  .post("/test", protect, async (context) => {
    const userId = requireUserId(context);
    const report =
      await TelegramNotificationService.sendTestNotification(userId);

    if (report.delivered === 0) {
      return context.json(
        {
          success: false,
          error:
            report.reason ?? "Failed to deliver Telegram test notification",
          report,
        },
        400,
      );
    }

    return context.json({ success: true, report });
  });
