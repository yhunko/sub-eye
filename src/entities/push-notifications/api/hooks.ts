import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { subscribeUserAction, unsubscribeUserAction } from "./actions";
import { PushNotificationsUtils } from "../lib/push-notifications.utils";
import { createQueryKeys } from "@lukemorales/query-key-factory";
import { QueryHook, MutationHook } from "@/shared/lib/react-query";

export const pushNotificationsQueryKeys = createQueryKeys(
  "PUSH_NOTIFICATIONS",
  {
    subscription: null,
  },
);

export const usePushNotificationsSubscription = ({
  options,
}: QueryHook<PushSubscription | null> = {}) => {
  return useQuery({
    queryKey: pushNotificationsQueryKeys.subscription.queryKey,
    queryFn: async () => {
      const registration = await navigator.serviceWorker.ready;
      return await registration.pushManager.getSubscription();
    },
    refetchInterval: false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    ...options,
  });
};

export const useSubscribeToPushNotifications = ({
  options,
}: MutationHook<PushSubscriptionJSON, void> = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const registration = await navigator.serviceWorker.ready;

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: PushNotificationsUtils.urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        ),
      });

      return await subscribeUserAction(sub.toJSON());
    },
    onSuccess(newSubscription) {
      queryClient.setQueryData(
        pushNotificationsQueryKeys.subscription.queryKey,
        newSubscription,
      );
    },
    ...options,
  });
};

export const useUnsubscribeFromPushNotifications = ({
  options,
}: MutationHook<void, void> = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      return await unsubscribeUserAction();
    },
    onSuccess() {
      queryClient.setQueryData(
        pushNotificationsQueryKeys.subscription.queryKey,
        null,
      );
    },
    ...options,
  });
};
