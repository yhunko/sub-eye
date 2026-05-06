import { getSubscriptionLifecycleStatus } from "shared";
import { db } from "../../db";
import { SubscriptionCancellationWorkflow } from "./subscriptionCancellationWorkflow";
import { SubscriptionNotificationsWorkflow } from "./subscriptionNotificationsWorkflow";
import type { SubscriptionRecord } from "./subscriptionRepository";
import { SubscriptionRepository } from "./subscriptionRepository";

export type SubscriptionSchedulingServiceDeps = {
  repository: typeof SubscriptionRepository;
  workflow: typeof SubscriptionNotificationsWorkflow;
  cancellationWorkflow: typeof SubscriptionCancellationWorkflow;
};

const defaultDeps: SubscriptionSchedulingServiceDeps = {
  repository: SubscriptionRepository,
  workflow: SubscriptionNotificationsWorkflow,
  cancellationWorkflow: SubscriptionCancellationWorkflow,
};

// Prevent overlapping reschedules from request bursts (e.g. preference saves)
// in the same server instance.
const rescheduleUserNotificationsLocks = new Map<string, Promise<void>>();

export class SubscriptionSchedulingService {
  static async rescheduleUserNotifications(
    userId: string,
    deps: SubscriptionSchedulingServiceDeps = defaultDeps,
  ): Promise<void> {
    const previous = rescheduleUserNotificationsLocks.get(userId);

    const run = async (): Promise<void> => {
      const subscriptions = await deps.repository.findByUserId(db, userId);

      // Important: keep rescheduling sequential per user. This reduces
      // overlapping cancel+schedule races during request bursts.
      for (const subscription of subscriptions) {
        const shouldScheduleRenewal =
          SubscriptionSchedulingService.shouldScheduleWorkflow(subscription);

        let cancelledRenewal = true;
        if (subscription.qstashMessageId) {
          cancelledRenewal =
            await SubscriptionSchedulingService.tryCancelWorkflow(
              subscription.qstashMessageId,
              deps,
            );
        }

        if (shouldScheduleRenewal) {
          // If we couldn't cancel the previous workflow run, avoid creating
          // a second run chain.
          if (cancelledRenewal || !subscription.qstashMessageId) {
            await SubscriptionSchedulingService.tryScheduleWorkflow(
              subscription,
              deps,
            );
          }
        } else if (subscription.qstashMessageId !== null) {
          await deps.repository.update(db, subscription.id, {
            qstashMessageId: null,
          });
        }

        const shouldScheduleCancellation =
          SubscriptionSchedulingService.shouldScheduleCancellationWorkflow(
            subscription,
          );

        if (subscription.cancellationQstashMessageId) {
          const cancelledCancellation =
            await SubscriptionSchedulingService.tryCancelCancellationWorkflow(
              subscription.cancellationQstashMessageId,
              deps,
            );

          // If we couldn't cancel the previous workflow run chain, avoid
          // scheduling a second one.
          if (shouldScheduleCancellation && !cancelledCancellation) {
            // Intentionally do not mutate cancellationQstashMessageId.
            continue;
          }
        }

        if (shouldScheduleCancellation) {
          await SubscriptionSchedulingService.tryScheduleCancellationWorkflow(
            subscription,
            deps,
          );
        } else if (subscription.cancellationQstashMessageId !== null) {
          await deps.repository.update(db, subscription.id, {
            cancellationQstashMessageId: null,
          });
        }
      }
    };

    const next = (previous ?? Promise.resolve()).then(run);
    rescheduleUserNotificationsLocks.set(userId, next);

    try {
      await next;
    } finally {
      if (rescheduleUserNotificationsLocks.get(userId) === next) {
        rescheduleUserNotificationsLocks.delete(userId);
      }
    }
  }

  static shouldScheduleWorkflow(subscription: SubscriptionRecord): boolean {
    const paymentDate = SubscriptionSchedulingService.normalizeDate(
      subscription.paymentDate,
    );
    if (!paymentDate) {
      return false;
    }

    const cancellationDate = SubscriptionSchedulingService.normalizeDate(
      subscription.willBeCancelledAt,
    );
    if (
      cancellationDate &&
      new Date(paymentDate).getTime() >= new Date(cancellationDate).getTime()
    ) {
      return false;
    }

    const status = getSubscriptionLifecycleStatus({
      willBeCancelledAt: cancellationDate,
    });

    return status !== "cancelled";
  }

  static shouldScheduleCancellationWorkflow(
    subscription: SubscriptionRecord,
  ): boolean {
    const cancellationDate = SubscriptionSchedulingService.normalizeDate(
      subscription.willBeCancelledAt,
    );
    if (!cancellationDate) {
      return false;
    }

    if (Date.parse(cancellationDate) <= Date.now()) {
      return false;
    }

    const status = getSubscriptionLifecycleStatus({
      willBeCancelledAt: cancellationDate,
    });

    return status !== "cancelled";
  }

  static async tryCancelWorkflow(
    workflowRunId: string,
    deps: SubscriptionSchedulingServiceDeps = defaultDeps,
  ): Promise<boolean> {
    try {
      await deps.workflow.cancel(workflowRunId);
      return true;
    } catch (error) {
      console.error("Failed to cancel subscription notifications", {
        workflowRunId,
        error,
      });
      return false;
    }
  }

  static async tryCancelCancellationWorkflow(
    workflowRunId: string,
    deps: SubscriptionSchedulingServiceDeps = defaultDeps,
  ): Promise<boolean> {
    try {
      await deps.cancellationWorkflow.cancel(workflowRunId);
      return true;
    } catch (error) {
      console.error(
        "Failed to cancel subscription cancellation notifications",
        {
          workflowRunId,
          error,
        },
      );
      return false;
    }
  }

  static async tryScheduleWorkflow(
    subscription: SubscriptionRecord,
    deps: SubscriptionSchedulingServiceDeps = defaultDeps,
  ): Promise<SubscriptionRecord> {
    try {
      return await SubscriptionSchedulingService.scheduleWorkflow(
        subscription,
        deps,
      );
    } catch (error) {
      console.error("Failed to schedule subscription notifications", {
        subscriptionId: subscription.id,
        error,
      });
      return subscription;
    }
  }

  static async tryScheduleCancellationWorkflow(
    subscription: SubscriptionRecord,
    deps: SubscriptionSchedulingServiceDeps = defaultDeps,
  ): Promise<SubscriptionRecord> {
    try {
      return await SubscriptionSchedulingService.scheduleCancellationWorkflow(
        subscription,
        deps,
      );
    } catch (error) {
      console.error(
        "Failed to schedule subscription cancellation notifications",
        {
          subscriptionId: subscription.id,
          error,
        },
      );
      return subscription;
    }
  }

  private static async scheduleWorkflow(
    subscription: SubscriptionRecord,
    deps: SubscriptionSchedulingServiceDeps,
  ): Promise<SubscriptionRecord> {
    const workflowRunId = await deps.workflow.schedule({
      subscriptionId: subscription.id,
      paymentDate: subscription.paymentDate,
    });

    return await deps.repository.update(db, subscription.id, {
      qstashMessageId: workflowRunId,
    });
  }

  private static async scheduleCancellationWorkflow(
    subscription: SubscriptionRecord,
    deps: SubscriptionSchedulingServiceDeps,
  ): Promise<SubscriptionRecord> {
    const workflowRunId = await deps.cancellationWorkflow.schedule({
      subscriptionId: subscription.id,
      cancellationDate: new Date(subscription.willBeCancelledAt!).toISOString(),
    });

    return await deps.repository.update(db, subscription.id, {
      cancellationQstashMessageId: workflowRunId,
    });
  }

  private static normalizeDate(value?: string | Date | null): string | null {
    if (!value) return null;
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}
