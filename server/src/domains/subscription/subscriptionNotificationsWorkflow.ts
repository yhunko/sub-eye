import { Client, type WorkflowContext } from "@upstash/workflow";
import { serve } from "@upstash/workflow/hono";
import { subDays } from "date-fns";
import { DateTimezoneUtils } from "shared";
import { RecurrenceUtils } from "shared";
import { shouldIncludeOccurrence } from "shared";
import type { UserPreferences } from "shared";
import { db } from "../../db";
import {
  SubscriptionRepository,
  type SubscriptionRecord,
} from "./subscriptionRepository";
import { UserService } from "../user/userService";
import { PushNotificationContent } from "../push-notification/pushNotificationContent";

export type SubscriptionWorkflowPayload = {
  subscriptionId: string;
  paymentDate: string;
};

export class SubscriptionNotificationsWorkflow {
  static handler = serve<SubscriptionWorkflowPayload>(
    async (context: WorkflowContext<SubscriptionWorkflowPayload>) => {
      const { subscriptionId, paymentDate } = context.requestPayload;
      const subscription = await SubscriptionRepository.findById(
        db,
        subscriptionId,
      );

      if (!subscription) {
        return;
      }

      const occurrenceDate = new Date(paymentDate);
      const shouldSendNotification = shouldIncludeOccurrence(
        {
          willBeCancelledAt: this.normalizeTimestamp(
            subscription.willBeCancelledAt,
          ),
        },
        occurrenceDate,
      );

      if (!shouldSendNotification) {
        await SubscriptionRepository.update(db, subscription.id, {
          qstashMessageId: null,
        });
        return;
      }

      const preferences = await UserService.getUserPreferences(
        subscription.userId,
      );
      const notifyAt =
        SubscriptionNotificationsWorkflow.calculateNotificationTime(
          subscription,
          preferences,
          paymentDate,
        );

      await context.sleepUntil("wait-for-notification", notifyAt);

      await context.run("send-notification", async () => {
        const { PushNotificationService } =
          await import("../../domains/push-notification/pushNotificationService");
        const notificationPayload = PushNotificationContent.buildRenewalPayload(
          {
            locale: preferences.locale,
            timezone: preferences.preferredTimezone,
            paymentDate,
            notificationDate: DateTimezoneUtils.now(
              preferences.preferredTimezone,
            ),
            subscriptionId: subscription.id,
            subscriptionName: subscription.name,
            brandDomain: subscription.brandDomain,
          },
        );

        const report = await PushNotificationService.sendNotification(
          subscription.userId,
          notificationPayload,
        );

        if (report.failed > 0) {
          console.error("Scheduled push delivery had failures", {
            subscriptionId: subscription.id,
            userId: subscription.userId,
            report,
          });
        }
      });

      const nextPayment = RecurrenceUtils.addPeriod(
        DateTimezoneUtils.toZoned(paymentDate, preferences.preferredTimezone),
        subscription.every,
        subscription.period,
        {
          anchorDate: DateTimezoneUtils.toZoned(
            subscription.paymentDate,
            preferences.preferredTimezone,
          ),
        },
      );

      await context.run("schedule-next-cycle", async () => {
        if (
          !shouldIncludeOccurrence(
            {
              willBeCancelledAt: this.normalizeTimestamp(
                subscription.willBeCancelledAt,
              ),
            },
            nextPayment,
          )
        ) {
          await SubscriptionRepository.update(db, subscription.id, {
            qstashMessageId: null,
          });
          return;
        }

        const workflowRunId = await SubscriptionNotificationsWorkflow.schedule({
          subscriptionId: subscription.id,
          paymentDate: nextPayment.toISOString(),
        });
        await SubscriptionRepository.update(db, subscription.id, {
          qstashMessageId: workflowRunId,
        });
      });
    },
  );

  static async schedule(payload: SubscriptionWorkflowPayload): Promise<string> {
    // TODO: Enforce on build / start
    const baseUrl = process.env.BASE_URL;
    if (!baseUrl) {
      throw new Error("Base URL is not set");
    }

    console.log("Running schedule");

    const workflowUrl = `${baseUrl}/api/subscriptions/notifications/workflow`;
    const client = this.createClient();
    const result = await client.trigger({
      url: workflowUrl,
      body: payload,
    });

    return result.workflowRunId;
  }

  static async cancel(workflowRunId: string): Promise<void> {
    const client = this.createClient();
    await client.cancel({ ids: workflowRunId });
  }

  private static calculateNotificationTime(
    subscription: SubscriptionRecord,
    preferences: UserPreferences,
    paymentDate: string,
  ): Date {
    const timezone = preferences.preferredTimezone;
    const notificationTime = preferences.notificationTime;
    const notificationOffset = Math.max(0, preferences.notificationOffset);

    const now = DateTimezoneUtils.now(timezone);
    const startDateZoned = DateTimezoneUtils.toZoned(paymentDate, timezone);

    const nextPayment = RecurrenceUtils.getNextOccurrence(
      startDateZoned,
      subscription.every,
      subscription.period,
      now,
    );

    let notifyDate = subDays(nextPayment, notificationOffset);
    let notifyAt = this.applyNotificationTime(
      notifyDate,
      timezone,
      notificationTime,
    );

    if (notifyAt.getTime() <= now.getTime()) {
      const nextPaymentAfter = RecurrenceUtils.addPeriod(
        nextPayment,
        subscription.every,
        subscription.period,
        {
          anchorDate: DateTimezoneUtils.toZoned(
            subscription.paymentDate,
            timezone,
          ),
        },
      );
      notifyDate = subDays(nextPaymentAfter, notificationOffset);
      notifyAt = this.applyNotificationTime(
        notifyDate,
        timezone,
        notificationTime,
      );
    }

    return notifyAt;
  }

  private static applyNotificationTime(
    date: Date,
    timezone: string,
    notificationTime: string,
  ): Date {
    const [hoursRaw, minutesRaw] = notificationTime.split(":");
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);

    const notifyAt = DateTimezoneUtils.toZoned(date, timezone);
    notifyAt.setHours(
      Number.isFinite(hours) ? hours : 10,
      Number.isFinite(minutes) ? minutes : 0,
      0,
      0,
    );

    return notifyAt;
  }

  private static createClient(): Client {
    const token =
      process.env.QSTASH_TOKEN ?? process.env.UPSTASH_WORKFLOW_TOKEN;

    if (!token) {
      throw new Error("QSTASH_TOKEN is not set");
    }

    return new Client({ token });
  }

  private static normalizeTimestamp(
    value?: string | Date | null,
  ): string | null {
    if (!value) {
      return null;
    }

    return value instanceof Date ? value.toISOString() : value;
  }
}
