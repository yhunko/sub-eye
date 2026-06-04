import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { subscriptionsQuery } from "@/entities/subscription";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components";

type NotificationDeliveryReport = {
  push: {
    delivered: number;
    failed: number;
    removed: number;
  };
  telegram: {
    delivered: number;
    skipped: number;
    reason?: string;
  };
};

type TestResponse = {
  report: NotificationDeliveryReport;
};

type RenewalPayload = {
  subscriptionId: string;
  daysUntilPayment: number;
};

type ExpiryPayload = {
  subscriptionId: string;
  daysUntilExpiry: number;
};

const baseApiUrl = import.meta.env.VITE_API_URL ?? "";

const getAuthHeaders = async (
  getToken: () => Promise<string | null>,
): Promise<HeadersInit> => {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const postTestNotification = async (
  getToken: () => Promise<string | null>,
  endpoint: string,
  payload: RenewalPayload | ExpiryPayload,
): Promise<TestResponse> => {
  const response = await fetch(`${baseApiUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await getAuthHeaders(getToken)),
    },
    body: JSON.stringify(payload),
    credentials: "include",
  });

  if (!response.ok) {
    const body = await response
      .clone()
      .json()
      .catch(() => null);
    const errorMessage =
      body && typeof body === "object" && typeof body.error === "string"
        ? body.error
        : "Failed to send notification";
    throw new Error(errorMessage);
  }

  return response.json();
};

export const Route = createFileRoute("/(protected)/dev/notifications")({
  component: DevNotificationsPage,
});

function DevNotificationsPage() {
  const { userId, getToken } = useAuth();
  const { data: subscriptions = [] } = useQuery(
    subscriptionsQuery({
      params: { userId: userId! },
      options: { enabled: Boolean(userId) },
    }),
  );
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!subscriptions.length) {
      setSelectedSubscriptionId(null);
      return;
    }

    setSelectedSubscriptionId((current) => {
      if (
        current &&
        subscriptions.some((subscription) => subscription.id === current)
      ) {
        return current;
      }

      return subscriptions[0]?.id ?? null;
    });
  }, [subscriptions]);

  const renewalMutation = useMutation({
    mutationFn: (payload: RenewalPayload) =>
      postTestNotification(
        getToken,
        "/api/dev/notifications/test-renewal",
        payload,
      ),
  });
  const expiryMutation = useMutation({
    mutationFn: (payload: ExpiryPayload) =>
      postTestNotification(
        getToken,
        "/api/dev/notifications/test-expiry",
        payload,
      ),
  });

  const activeReport =
    expiryMutation.data?.report ?? renewalMutation.data?.report;
  const activeError = renewalMutation.error ?? expiryMutation.error;
  const isSending = renewalMutation.isPending || expiryMutation.isPending;

  const runRenewal = (daysUntilPayment: number) => {
    if (!selectedSubscriptionId || isSending) {
      return;
    }

    renewalMutation.reset();
    expiryMutation.reset();
    renewalMutation.mutate({
      subscriptionId: selectedSubscriptionId,
      daysUntilPayment,
    });
  };

  const runExpiry = (daysUntilExpiry: number) => {
    if (!selectedSubscriptionId || isSending) {
      return;
    }

    renewalMutation.reset();
    expiryMutation.reset();
    expiryMutation.mutate({
      subscriptionId: selectedSubscriptionId,
      daysUntilExpiry,
    });
  };

  return (
    <div className="container max-w-3xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Notification Test Lab</CardTitle>
          <CardDescription>
            Send real push and Telegram notifications immediately for the
            selected subscription.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium">Subscription</p>
            <select
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
              disabled={isSending || subscriptions.length === 0}
              value={selectedSubscriptionId ?? ""}
              onChange={(event) =>
                setSelectedSubscriptionId(event.target.value)
              }
            >
              {subscriptions.map((subscription) => (
                <option key={subscription.id} value={subscription.id}>
                  {subscription.name}
                </option>
              ))}
              {subscriptions.length === 0 && (
                <option value="">No subscriptions found</option>
              )}
            </select>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Renewal</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => runRenewal(0)}
                disabled={!selectedSubscriptionId || isSending}
              >
                Today (0 d)
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => runRenewal(1)}
                disabled={!selectedSubscriptionId || isSending}
              >
                Tomorrow (1 d)
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => runRenewal(3)}
                disabled={!selectedSubscriptionId || isSending}
              >
                In 3 days
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => runRenewal(7)}
                disabled={!selectedSubscriptionId || isSending}
              >
                In 7 days
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Expiry</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => runExpiry(1)}
                disabled={!selectedSubscriptionId || isSending}
              >
                In 1 day
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => runExpiry(3)}
                disabled={!selectedSubscriptionId || isSending}
              >
                In 3 days
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => runExpiry(7)}
                disabled={!selectedSubscriptionId || isSending}
              >
                In 7 days
              </Button>
            </div>
          </div>

          {isSending && (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Sending notification...
            </div>
          )}

          {activeError instanceof Error && (
            <div className="text-destructive flex items-center gap-2 text-sm">
              <AlertTriangle className="size-4" />
              {activeError.message}
            </div>
          )}

          {activeReport && (
            <div className="bg-muted/40 space-y-2 rounded-md border p-4 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="size-4" />
                Delivery report
              </div>
              <p>
                Push: delivered {activeReport.push.delivered}, failed{" "}
                {activeReport.push.failed}, removed {activeReport.push.removed}
              </p>
              <p>
                Telegram: delivered {activeReport.telegram.delivered}, skipped{" "}
                {activeReport.telegram.skipped}
                {activeReport.telegram.reason
                  ? ` (${activeReport.telegram.reason})`
                  : ""}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
