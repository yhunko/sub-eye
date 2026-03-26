import type { Context } from "hono";
import {
  cleanupUserData,
  type UserCleanupResult,
} from "../../../../domains/user/userCleanupService";
import { captureServerEvent } from "../../../../utils/analytics";
import type { ClerkWebhookEnv } from "../types";

const logStructured = (
  phase: "start" | "complete" | "errors",
  data: Record<string, unknown>,
) => {
  console.log(JSON.stringify({ event: "user.deleted", phase, ...data }));
};

const toStatusRecord = (result: UserCleanupResult): Record<string, string> => {
  return Object.fromEntries(
    result.results.map((r) => [r.domain, r.ok ? "ok" : "failed"]),
  );
};

export const handleUserDeleted = async (c: Context<ClerkWebhookEnv>) => {
  const { data } = c.var.webhookEvent;
  const userId = data.id;
  const posthogKey = c.env.POSTHOG_KEY;

  logStructured("start", { userId });

  const result = await cleanupUserData(userId);

  logStructured("complete", {
    userId,
    domains: toStatusRecord(result),
  });

  void captureServerEvent("user_deleted", posthogKey, {
    distinctId: userId,
    properties: {
      source: "clerk_webhook",
      ...toStatusRecord(result),
    },
  });

  if (result.errors.length > 0) {
    for (const { domain, error } of result.errors) {
      void captureServerEvent("$exception", posthogKey, {
        distinctId: userId,
        properties: {
          $exception_type: "CleanupError",
          $exception_message: error,
          $exception_is_handled: true,
          domain,
          source: "user_deleted_cleanup",
        },
      });
    }

    logStructured("errors", {
      userId,
      errors: result.errors,
    });
  }

  return c.text("Webhook received", 200);
};
