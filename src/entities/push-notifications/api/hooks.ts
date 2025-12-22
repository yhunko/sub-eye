import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { subscribeUserAction, unsubscribeUserAction } from "./actions";
import { PushNotificationsUtils } from "../lib/push-notifications.utils";
import { MutationHook, QueryHook } from "@/shared/lib/react-query";
import { createQueryKeys } from "@lukemorales/query-key-factory";
import { ServiceWorkerUtils } from "@/shared/lib";

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
      const registration = await ServiceWorkerUtils.getRegistration();

      if (!registration) return null;

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

export const useSubscribeToPushNotifications = ({}: MutationHook<
  PushSubscription,
  void
> = {}) => {
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
      const serialized = sub.toJSON();

      return await subscribeUserAction(serialized);
    },
    onSuccess(subscription) {
      queryClient.setQueryData(
        pushNotificationsQueryKeys.subscription.queryKey,
        subscription,
      );
    },
  });
};

export const useUnsubscribeFromPushNotifications = ({
  options,
}: MutationHook<void, void> = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unsubscribeUserAction,
    onSuccess() {
      queryClient.setQueryData(
        pushNotificationsQueryKeys.subscription.queryKey,
        null,
      );
    },
    ...options,
  });
};
