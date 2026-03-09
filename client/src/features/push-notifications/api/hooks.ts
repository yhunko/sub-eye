import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query";
import { pushNotificationsQueryKeys } from "../model/query-keys";
import { PushNotificationsUtils } from "../lib/push-notifications.utils";
import { apiClient as client } from "@/shared/api/client";
import { getSerwist } from "virtual:serwist";
import type {
  TelegramLinkStartResponse,
  TelegramNotificationStatus,
  TelegramSendReport,
  UpdateTelegramMessageTemplate,
  UpdateTelegramNotificationPreferences,
} from "shared";

export const usePushNotificationsSubscription = (
  options: Partial<UseQueryOptions<PushSubscription | null>> = {},
) => {
  return useQuery({
    queryKey: pushNotificationsQueryKeys.subscription.queryKey,
    queryFn: async () => {
      const serwist = await getSerwist();
      if (!serwist) return null;

      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();

      if (sub) {
        const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        const existingKey = sub.options.applicationServerKey;

        if (
          vapidKey &&
          !PushNotificationsUtils.areKeysEqual(existingKey, vapidKey)
        ) {
          console.warn(
            "VAPID key mismatch in query. Considering as not subscribed.",
          );

          // We return null so the UI shows "Off".
          // The user will then toggle "On", triggering useSubscribeToPushNotifications, which handles the cleanup/resubscribe logic.
          return null;
        }
      }
      return sub;
    },
    refetchInterval: false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    ...options,
  });
};

export const useSubscribeToPushNotifications = (
  options: Partial<UseMutationOptions<void, Error, void>> = {},
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const serwist = await getSerwist();
      if (!serwist) return;

      const registration = await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Permission denied");
      }

      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        throw new Error("VITE_VAPID_PUBLIC_KEY is not set");
      }

      let sub = await registration.pushManager.getSubscription();

      if (sub) {
        const existingKey = sub.options.applicationServerKey;
        if (!PushNotificationsUtils.areKeysEqual(existingKey, vapidKey)) {
          console.log(
            "VAPID key changed, unsubscribing from old subscription...",
          );
          await sub.unsubscribe();
          sub = null;
        }
      }

      if (!sub) {
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey:
            PushNotificationsUtils.urlBase64ToUint8Array(vapidKey),
        });
      }

      const keys = sub.toJSON().keys;
      if (!keys?.p256dh || !keys?.auth) {
        throw new Error("Failed to get subscription keys");
      }

      const response = await client.api["push-notifications"].subscribe.$post({
        json: {
          endpoint: sub.endpoint,
          keys: {
            p256dh: keys.p256dh,
            auth: keys.auth,
          },
        },
      });

      if (!response.ok) {
        throw new Error("Failed to persist push subscription");
      }
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: pushNotificationsQueryKeys.subscription.queryKey,
      });
    },
    ...options,
  });
};

export const useUnsubscribeFromPushNotifications = (
  options: Partial<UseMutationOptions<void, Error, void>> = {},
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!("serviceWorker" in navigator)) return;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        const response = await client.api[
          "push-notifications"
        ].unsubscribe.$post({
          json: { endpoint: subscription.endpoint },
        });

        if (!response.ok) {
          throw new Error("Failed to remove push subscription");
        }
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(
        pushNotificationsQueryKeys.subscription.queryKey,
        null,
      );
    },
    onError: async () => {
      await queryClient.refetchQueries({
        queryKey: pushNotificationsQueryKeys.subscription.queryKey,
      });
    },
    ...options,
  });
};

export const useTelegramNotificationStatus = (
  options: Partial<UseQueryOptions<TelegramNotificationStatus>> = {},
) => {
  return useQuery({
    queryKey: pushNotificationsQueryKeys.telegramStatus.queryKey,
    queryFn: async () => {
      const response = await client.api["telegram-notifications"].status.$get();

      if (!response.ok) {
        throw new Error("Failed to fetch telegram notification status");
      }

      return response.json();
    },
    ...options,
  });
};

export const useStartTelegramLink = (
  options: Partial<
    UseMutationOptions<TelegramLinkStartResponse, Error, void>
  > = {},
) => {
  return useMutation({
    mutationFn: async () => {
      const response =
        await client.api["telegram-notifications"].link.start.$post();

      if (!response.ok) {
        throw new Error("Failed to start telegram linking");
      }

      return response.json();
    },
    ...options,
  });
};

export const useUpdateTelegramNotificationPreferences = (
  options: Partial<
    UseMutationOptions<
      TelegramNotificationStatus,
      Error,
      UpdateTelegramNotificationPreferences
    >
  > = {},
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await client.api[
        "telegram-notifications"
      ].preferences.$patch({
        json: payload,
      });

      if (!response.ok) {
        throw new Error("Failed to update telegram notification preferences");
      }

      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: pushNotificationsQueryKeys.telegramStatus.queryKey,
      });
    },
    ...options,
  });
};

export const useDisconnectTelegramNotifications = (
  options: Partial<UseMutationOptions<void, Error, void>> = {},
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response =
        await client.api["telegram-notifications"].disconnect.$post();

      if (!response.ok) {
        throw new Error("Failed to disconnect telegram notifications");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: pushNotificationsQueryKeys.telegramStatus.queryKey,
      });
    },
    ...options,
  });
};

export const useUpdateTelegramMessageTemplate = (
  options: Partial<
    UseMutationOptions<
      TelegramNotificationStatus,
      Error,
      UpdateTelegramMessageTemplate
    >
  > = {},
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await client.api[
        "telegram-notifications"
      ].template.$patch({
        json: payload,
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          body?.error ?? "Failed to update telegram message template",
        );
      }

      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: pushNotificationsQueryKeys.telegramStatus.queryKey,
      });
    },
    ...options,
  });
};

export const useSendTelegramTestNotification = (
  options: Partial<UseMutationOptions<TelegramSendReport, Error, void>> = {},
) => {
  return useMutation({
    mutationFn: async () => {
      const response = await client.api["telegram-notifications"].test.$post();
      const body = await response
        .json()
        .catch(() => ({ report: undefined as TelegramSendReport | undefined }));

      if (!response.ok) {
        throw new Error("Failed to send telegram test notification");
      }

      return body.report as TelegramSendReport;
    },
    ...options,
  });
};
