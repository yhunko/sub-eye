import {
  isLikelyStaleSubscription,
  type PushDeliveryFailure,
  type PushDeliveryResult,
  getVapidDetailsFromEnv as readVapidDetailsFromEnv,
  sendWebPush,
  type VapidDetails,
} from "@subeye/notifications/push";
import type { PushNotificationPayload } from "@subeye/shared";
import { PushNotificationRepository } from "./pushNotificationRepository";

export type { VapidDetails };

export type PushDeliveryReport = {
  attempted: number;
  delivered: number;
  failed: number;
  removed: number;
  failures: PushDeliveryFailure[];
};

export class PushNotificationService {
  static async subscribe(
    userId: string,
    endpoint: string,
    p256dh: string,
    auth: string,
  ): Promise<void> {
    await PushNotificationRepository.create({
      userId,
      endpoint,
      p256dh,
      auth,
    });
  }

  static async unsubscribe(userId: string, endpoint: string): Promise<void> {
    await PushNotificationRepository.deleteByUserAndEndpoint(userId, endpoint);
  }

  /**
   * Send a notification to all devices of a user and report per-device results.
   */
  static async sendNotification(
    userId: string,
    payload: PushNotificationPayload,
    vapidDetails: VapidDetails,
  ): Promise<PushDeliveryReport> {
    const subscriptions = await PushNotificationRepository.findByUserId(userId);

    if (subscriptions.length === 0) {
      return {
        attempted: 0,
        delivered: 0,
        failed: 0,
        removed: 0,
        failures: [],
      };
    }

    const payloadString = JSON.stringify(payload);
    const attempts = await Promise.all(
      subscriptions.map((subscription) =>
        sendWebPush(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          payloadString,
          vapidDetails,
        ),
      ),
    );

    const failures = attempts
      .filter(
        (attempt): attempt is Extract<PushDeliveryResult, { ok: false }> =>
          !attempt.ok,
      )
      .map((attempt) => attempt.failure);

    const staleFailures = failures.filter((failure) =>
      isLikelyStaleSubscription(failure),
    );

    if (staleFailures.length > 0) {
      await Promise.all(
        staleFailures.map((failure) =>
          PushNotificationRepository.deleteByEndpoint(failure.endpoint),
        ),
      );
    }

    const delivered = attempts.length - failures.length;
    const report: PushDeliveryReport = {
      attempted: subscriptions.length,
      delivered,
      failed: failures.length,
      removed: staleFailures.length,
      failures,
    };

    if (report.failed > 0) {
      console.error(
        `Push delivery had ${report.failed} failure(s) for user ${userId}`,
        report,
      );
    }

    return report;
  }

  static async deleteAllForUser(userId: string): Promise<void> {
    await PushNotificationRepository.deleteByUserId(userId);
  }

  static getVapidDetailsFromEnv(): VapidDetails {
    return readVapidDetailsFromEnv();
  }
}
