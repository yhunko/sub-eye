import { Client, type WorkflowContext } from "@upstash/workflow";
import { serve } from "@upstash/workflow/hono";
import { subDays } from "date-fns";
import type { UserPreferences } from "shared";
import {
  CurrencyUtils,
  DateTimezoneUtils,
  RecurrenceUtils,
  shouldIncludeOccurrence,
} from "shared";
import { db } from "../../db";
import { CurrencyService } from "../currency/currencyService";
import { PushNotificationContent } from "../push-notification/pushNotificationContent";
import { PushNotificationService } from "../push-notification/pushNotificationService";
import { UserService } from "../user/userService";
import {
  type SubscriptionRecord,
  SubscriptionRepository,
} from "./subscriptionRepository";

export type SubscriptionWorkflowPayload = {
  subscriptionId: string;
  paymentDate: string;
};

type ResolvedOccurrence = {
  date: Date;
};

type NotificationSchedule = {
  notifyAt: Date;
  targetPayment: Date;
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

      const preferences = await UserService.getUserPreferences(
        subscription.userId,
      );
      const { notifyAt, targetPaymentDate } =
        SubscriptionNotificationsWorkflow.calculateNotificationTime(
          subscription,
          preferences,
          paymentDate,
        );
      const targetPayment = new Date(targetPaymentDate);

      const shouldSendNotification = shouldIncludeOccurrence(
        {
          willBeCancelledAt: this.normalizeTimestamp(
            subscription.willBeCancelledAt,
          ),
        },
        targetPayment,
      );

      if (!shouldSendNotification) {
        await SubscriptionRepository.update(db, subscription.id, {
          qstashMessageId: null,
        });
        return;
      }

      await context.sleepUntil("wait-for-notification", notifyAt);

      await context.run("send-notification", async () => {
        const { NotificationDeliveryService } = await import(
          "../../domains/notification/notificationDeliveryService"
        );

        const scheduledEffectiveAt = subscription.scheduledEffectiveAt
          ? new Date(subscription.scheduledEffectiveAt)
          : null;
        const hasScheduledPriceChange =
          subscription.scheduledCost != null &&
          subscription.scheduledCurrency != null &&
          scheduledEffectiveAt != null &&
          !Number.isNaN(scheduledEffectiveAt.getTime()) &&
          scheduledEffectiveAt.getTime() <= targetPayment.getTime();

        const originalPriceAmount = hasScheduledPriceChange
          ? Number(subscription.scheduledCost)
          : Number(subscription.cost);
        const originalPriceCurrencyCode = hasScheduledPriceChange
          ? subscription.scheduledCurrency!
          : subscription.currency;
        const preferredPriceCurrencyCode = preferences.preferredCurrency;
        const rates = await CurrencyService.getRates(
          preferredPriceCurrencyCode,
        );
        const preferredPriceAmount = CurrencyUtils.convert(
          originalPriceAmount,
          originalPriceCurrencyCode,
          preferredPriceCurrencyCode,
          rates,
        );
        const notificationPayload = PushNotificationContent.buildRenewalPayload(
          {
            locale: preferences.locale,
            timezone: preferences.preferredTimezone,
            paymentDate: targetPaymentDate,
            notificationDate: DateTimezoneUtils.now(
              preferences.preferredTimezone,
            ),
            subscriptionId: subscription.id,
            subscriptionName: subscription.name,
            originalPriceAmount,
            originalPriceCurrencyCode,
            preferredPriceAmount,
            preferredPriceCurrencyCode,
            brandDomain: subscription.brandDomain,
          },
        );

        const vapidDetails = PushNotificationService.getVapidDetailsFromEnv();

        const report = await NotificationDeliveryService.sendNotification(
          subscription.userId,
          notificationPayload,
          { locale: preferences.locale, vapidDetails },
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
        DateTimezoneUtils.toZoned(
          targetPaymentDate,
          preferences.preferredTimezone,
        ),
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
    const client = SubscriptionNotificationsWorkflow.createClient();
    const result = await client.trigger({
      url: workflowUrl,
      body: payload,
    });

    return result.workflowRunId;
  }

  static async cancel(workflowRunId: string): Promise<void> {
    const client = SubscriptionNotificationsWorkflow.createClient();
    await client.cancel({ ids: workflowRunId });
  }

  private static calculateNotificationTime(
    subscription: SubscriptionRecord,
    preferences: UserPreferences,
    paymentDate: string,
  ): { notifyAt: Date; targetPaymentDate: string } {
    const timezone = preferences.preferredTimezone;
    const notificationTime = preferences.notificationTime;
    const notificationOffset = Math.max(0, preferences.notificationOffset);

    const now = DateTimezoneUtils.now(timezone);
    const targetPayment =
      SubscriptionNotificationsWorkflow.resolveUpcomingPayment(
        subscription,
        paymentDate,
        timezone,
        now,
      ).date;

    const schedule = SubscriptionNotificationsWorkflow.resolveSchedule(
      subscription,
      targetPayment,
      timezone,
      notificationOffset,
      notificationTime,
      now,
    );

    return {
      notifyAt: schedule.notifyAt,
      targetPaymentDate: schedule.targetPayment.toISOString(),
    };
  }

  private static resolveUpcomingPayment(
    subscription: SubscriptionRecord,
    paymentDate: string,
    timezone: string,
    now: Date,
  ): ResolvedOccurrence {
    const canonicalPayment = DateTimezoneUtils.toZoned(
      subscription.paymentDate,
      timezone,
    );
    const canonicalPaymentDay = DateTimezoneUtils.startOfDay(
      canonicalPayment,
      timezone,
    );
    const today = DateTimezoneUtils.startOfDay(now, timezone);

    if (canonicalPaymentDay.getTime() >= today.getTime()) {
      return { date: canonicalPayment };
    }

    const canonicalNext = RecurrenceUtils.getNextOccurrence(
      canonicalPayment,
      subscription.every,
      subscription.period,
      now,
    );

    const payloadPayment = DateTimezoneUtils.toZoned(paymentDate, timezone);
    const payloadPaymentDay = DateTimezoneUtils.startOfDay(
      payloadPayment,
      timezone,
    );
    const canonicalNextDay = DateTimezoneUtils.startOfDay(
      canonicalNext,
      timezone,
    );

    if (payloadPaymentDay.getTime() === canonicalNextDay.getTime()) {
      return { date: payloadPayment };
    } else {
      console.warn(
        "Ignoring stale workflow payload payment date for subscription notification scheduling",
        {
          subscriptionId: subscription.id,
          payloadPaymentDate: paymentDate,
          canonicalNextPaymentDate: canonicalNext.toISOString(),
          timezone,
        },
      );
    }

    return { date: canonicalNext };
  }

  private static resolveSchedule(
    subscription: SubscriptionRecord,
    targetPayment: Date,
    timezone: string,
    notificationOffset: number,
    notificationTime: string,
    now: Date,
  ): NotificationSchedule {
    const initialNotifyAt = SubscriptionNotificationsWorkflow.buildNotifyAt(
      targetPayment,
      timezone,
      notificationOffset,
      notificationTime,
    );
    if (initialNotifyAt.getTime() > now.getTime()) {
      return { targetPayment, notifyAt: initialNotifyAt };
    }

    if (
      SubscriptionNotificationsWorkflow.isCurrentPaymentDay(
        targetPayment,
        now,
        timezone,
      )
    ) {
      return { targetPayment, notifyAt: now };
    }

    const nextTargetPayment = SubscriptionNotificationsWorkflow.nextPayment(
      subscription,
      targetPayment,
      timezone,
    );

    return {
      targetPayment: nextTargetPayment,
      notifyAt: SubscriptionNotificationsWorkflow.buildNotifyAt(
        nextTargetPayment,
        timezone,
        notificationOffset,
        notificationTime,
      ),
    };
  }

  private static buildNotifyAt(
    paymentDate: Date,
    timezone: string,
    notificationOffset: number,
    notificationTime: string,
  ): Date {
    return SubscriptionNotificationsWorkflow.applyNotificationTime(
      subDays(paymentDate, notificationOffset),
      timezone,
      notificationTime,
    );
  }

  private static isCurrentPaymentDay(
    paymentDate: Date,
    now: Date,
    timezone: string,
  ): boolean {
    const paymentDay = DateTimezoneUtils.startOfDay(paymentDate, timezone);
    const today = DateTimezoneUtils.startOfDay(now, timezone);
    return paymentDay.getTime() >= today.getTime();
  }

  private static nextPayment(
    subscription: SubscriptionRecord,
    paymentDate: Date,
    timezone: string,
  ): Date {
    return RecurrenceUtils.addPeriod(
      paymentDate,
      subscription.every,
      subscription.period,
      {
        anchorDate: DateTimezoneUtils.toZoned(
          subscription.paymentDate,
          timezone,
        ),
      },
    );
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
