import type { PushNotificationPayload } from "shared";
import webpush from "web-push";
import {
  PushNotificationRepository,
  type PushSubscriptionRecord,
} from "./pushNotificationRepository";

export type VapidDetails = {
  subject: string;
  publicKey: string;
  privateKey: string;
};

export type PushDeliveryFailure = {
  endpoint: string;
  status: number;
  statusText: string;
  reason?: string;
};

export type PushDeliveryReport = {
  attempted: number;
  delivered: number;
  failed: number;
  removed: number;
  failures: PushDeliveryFailure[];
};

type DeliveryAttemptResult =
  | { ok: true }
  | { ok: false; failure: PushDeliveryFailure };

export class PushNotificationService {
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
        PushNotificationService.sendToSubscription(
          subscription,
          payloadString,
          vapidDetails,
        ),
      ),
    );

    const failures = attempts
      .filter(
        (attempt): attempt is Extract<DeliveryAttemptResult, { ok: false }> =>
          !attempt.ok,
      )
      .map((attempt) => attempt.failure);

    const staleFailures = failures.filter((failure) =>
      PushNotificationService.isLikelyStaleSubscription(failure),
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
    const subject = process.env.VAPID_SUBJECT;
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!subject || !publicKey || !privateKey) {
      throw new Error(
        "VAPID configuration is incomplete. Expected VAPID_SUBJECT, VAPID_PUBLIC_KEY, and VAPID_PRIVATE_KEY.",
      );
    }

    const hasValidSubject =
      subject.startsWith("mailto:") || subject.startsWith("https://");

    if (!hasValidSubject) {
      throw new Error("VAPID_SUBJECT must start with 'mailto:' or 'https://'.");
    }

    return { subject, publicKey, privateKey };
  }

  private static async sendToSubscription(
    subscription: PushSubscriptionRecord,
    payloadString: string,
    vapidDetails: VapidDetails,
  ): Promise<DeliveryAttemptResult> {
    try {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      };

      const details = webpush.generateRequestDetails(
        pushSubscription,
        payloadString,
        { vapidDetails },
      );

      const response = await fetch(details.endpoint, {
        method: "POST",
        headers: details.headers as RequestInit["headers"],
        body: details.body as RequestInit["body"],
      });

      if (response.ok) {
        return { ok: true };
      }

      const responseBody = await response.text().catch(() => "");
      return {
        ok: false,
        failure: {
          endpoint: subscription.endpoint,
          status: response.status,
          statusText: response.statusText,
          reason: PushNotificationService.extractFailureReason(responseBody),
        },
      };
    } catch (error) {
      return {
        ok: false,
        failure: {
          endpoint: subscription.endpoint,
          status: 0,
          statusText: "Request Error",
          reason: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  private static extractFailureReason(body: string): string | undefined {
    if (!body) {
      return undefined;
    }

    try {
      const parsed: unknown = JSON.parse(body);

      if (
        parsed &&
        typeof parsed === "object" &&
        "reason" in parsed &&
        typeof parsed.reason === "string"
      ) {
        return parsed.reason;
      }

      if (
        parsed &&
        typeof parsed === "object" &&
        "error" in parsed &&
        parsed.error &&
        typeof parsed.error === "object" &&
        "message" in parsed.error &&
        typeof parsed.error.message === "string"
      ) {
        return parsed.error.message;
      }
    } catch {
      // Ignore parse errors and fallback to plaintext body.
    }

    return body.slice(0, 200);
  }

  private static isLikelyStaleSubscription(
    failure: PushDeliveryFailure,
  ): boolean {
    if (failure.status === 404 || failure.status === 410) {
      return true;
    }

    if (failure.status !== 403 || !failure.reason) {
      return false;
    }

    const reason = failure.reason.toLowerCase();

    return (
      reason.includes("baddevicetoken") ||
      reason.includes("devicetokennotfortopic") ||
      reason.includes("unregistered") ||
      reason.includes("unauthorizedregistration") ||
      reason.includes("senderid mismatch") ||
      reason.includes("mismatchsenderid") ||
      reason.includes("vapid credentials") ||
      reason.includes("vapid")
    );
  }
}
