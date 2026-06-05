import webpush from "web-push";

export type VapidDetails = {
  subject: string;
  publicKey: string;
  privateKey: string;
};

export type PushSubscriptionInfo = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type PushDeliveryFailure = {
  endpoint: string;
  status: number;
  statusText: string;
  reason?: string;
};

export type PushDeliveryResult =
  | { ok: true }
  | { ok: false; failure: PushDeliveryFailure };

/**
 * Web-push transport. Pure delivery + VAPID config — no database. Device-token
 * persistence and per-user delivery aggregation live in the server's
 * push-notification domain.
 */
export function getVapidDetailsFromEnv(): VapidDetails {
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

/** Deliver an already-serialized payload to a single push subscription. */
export async function sendWebPush(
  subscription: PushSubscriptionInfo,
  payload: string,
  vapidDetails: VapidDetails,
): Promise<PushDeliveryResult> {
  try {
    const details = webpush.generateRequestDetails(subscription, payload, {
      vapidDetails,
    });

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
        reason: extractFailureReason(responseBody),
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

/** Whether a delivery failure indicates the subscription should be pruned. */
export function isLikelyStaleSubscription(
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

function extractFailureReason(body: string): string | undefined {
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
