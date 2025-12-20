import { QStashService } from "./qstash.service";
import { SubscriptionRepository } from "../../subscription/repository/subscription.repository";
import { clerkClient } from "@clerk/nextjs/server";
import { UserPublicMetadata } from "@/entities/user/model/user.model";
import { addDays, addMonths, addWeeks, addYears, subDays } from "date-fns";
import { DateTimezoneUtils } from "@/shared/lib";
import { Period } from "@/shared/lib/db";
import { SubscriptionSchema } from "@/shared/lib/db/schema";

export class PushNotificationsSchedulerService {
  constructor(
    private qstashService = new QStashService(),
    private subscriptionRepository = new SubscriptionRepository(),
  ) {}

  async scheduleForSubscription(
    subscription: SubscriptionSchema,
  ): Promise<string> {
    const client = await clerkClient();
    const user = await client.users.getUser(subscription.userId);
    const metadata = user.publicMetadata as UserPublicMetadata;

    const notifyAt = this.calculateNotificationTime(subscription, metadata);

    const messageId = await this.qstashService.scheduleNotification({
      userId: subscription.userId,
      subscriptionId: subscription.id,
      subscriptionName: subscription.name,
      notifyAt,
    });

    // Update subscription with QStash message ID
    await this.subscriptionRepository.update(subscription.id, {
      qstashMessageId: messageId,
    });

    return messageId;
  }

  async cancelForSubscription(subscription: SubscriptionSchema): Promise<void> {
    if (subscription.qstashMessageId) {
      await this.qstashService.cancelNotification(subscription.qstashMessageId);
    }
  }

  async rescheduleForSubscription(
    subscription: SubscriptionSchema,
  ): Promise<string> {
    const client = await clerkClient();
    const user = await client.users.getUser(subscription.userId);
    const metadata = user.publicMetadata as UserPublicMetadata;

    const notifyAt = this.calculateNotificationTime(subscription, metadata);

    let messageId: string;

    if (subscription.qstashMessageId) {
      messageId = await this.qstashService.rescheduleNotification({
        oldMessageId: subscription.qstashMessageId,
        userId: subscription.userId,
        subscriptionId: subscription.id,
        subscriptionName: subscription.name,
        notifyAt,
      });
    } else {
      messageId = await this.qstashService.scheduleNotification({
        userId: subscription.userId,
        subscriptionId: subscription.id,
        subscriptionName: subscription.name,
        notifyAt,
      });
    }

    await this.subscriptionRepository.update(subscription.id, {
      qstashMessageId: messageId,
    });

    return messageId;
  }

  private calculateNotificationTime(
    subscription: SubscriptionSchema,
    metadata: UserPublicMetadata,
  ): Date {
    const timezone = metadata.preferredTimezone;
    const notificationTime = metadata.notificationTime || "10:00";
    const notificationOffset = metadata.notificationOffset || 0; // 0 = same day, 1 = day before

    // Calculate next payment date
    const nextPayment = this.calculateNextPaymentDate(subscription, timezone);

    // Apply offset (send notification X days before)
    const notifyDate = subDays(nextPayment, notificationOffset);

    // Parse notification time (e.g., "10:00")
    const [hours, minutes] = notificationTime.split(":").map(Number);

    // Create notification datetime in user's timezone
    const notifyAt = DateTimezoneUtils.toZoned(
      notifyDate.toISOString(),
      timezone,
    );
    notifyAt.setHours(hours, minutes, 0, 0);

    return notifyAt;
  }

  private calculateNextPaymentDate(
    subscription: SubscriptionSchema,
    timezone?: string,
  ): Date {
    const now = DateTimezoneUtils.now(timezone);
    let current = DateTimezoneUtils.toZoned(subscription.paymentDate, timezone);

    while (current <= now) {
      current = this.addPeriod(
        current,
        subscription.every,
        subscription.period,
      );
    }

    return current;
  }

  private addPeriod(date: Date, amount: number, period: Period): Date {
    switch (period) {
      case "day":
        return addDays(date, amount);
      case "week":
        return addWeeks(date, amount);
      case "month":
        return addMonths(date, amount);
      case "year":
        return addYears(date, amount);
      default:
        return date;
    }
  }
}
