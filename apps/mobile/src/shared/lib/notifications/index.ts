import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { deviceFlags } from "@/shared/lib/mmkv";
import { planRenewalReminders, type RenewalInput } from "./plan";

/**
 * Renewal reminders, scheduled **entirely on the device**. No push tokens, no
 * APNs/FCM, no server endpoint, no DB row, no cron: the notification set is a
 * pure function of the subscription list the app already holds in its
 * MMKV-persisted query cache, so nothing round-trips.
 *
 * The whole schedule is rebuilt wholesale — cancel all, recompute, re-schedule —
 * on every foreground. That is idempotent by construction: no reconciliation, no
 * stored notification ids, and no way for the device to drift out of sync with
 * the list.
 */

/**
 * MMKV, not the server. This is what keeps DB load at exactly zero, and the
 * consequence is worth stating plainly: **the toggle is per-device, not
 * per-account.** Two phones schedule independently, and a reinstall forgets it.
 * That is the price of zero server, and it is the right trade here.
 */
const ENABLED_KEY = "notifications.renewalReminders";

/** Android 8+ shows NOTHING without a channel — not an error, just silence. */
const ANDROID_CHANNEL_ID = "renewals";

// Without a handler, a reminder that fires while the app is open is swallowed.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** The user's stored preference. Says nothing about OS permission. */
export function renewalRemindersEnabled(): boolean {
  return deviceFlags.get(ENABLED_KEY);
}

/**
 * The OS has refused and will not ask again — the screen-1b state.
 *
 * `denied` is terminal on iOS: `requestPermissionsAsync` then resolves to
 * `denied` without ever showing a prompt, and the only route back is
 * `Linking.openSettings()`. The UI needs this to stop offering a switch that
 * cannot do anything, whether permission was never granted or later revoked.
 */
export async function renewalRemindersBlocked(): Promise<boolean> {
  const { granted, canAskAgain } = await Notifications.getPermissionsAsync();
  return !granted && !canAskAgain;
}

/**
 * Rebuild the pending schedule from `subscriptions`. Safe to call at any time
 * and any number of times.
 */
export async function syncRenewalReminders(
  subscriptions: RenewalInput[],
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!renewalRemindersEnabled()) return;

  // Permission can be revoked in OS Settings long after the toggle was set. Stop
  // scheduling, but keep the preference — the UI surfaces the denied state and
  // the schedule comes back on its own if permission is restored.
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: "Renewals",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  for (const reminder of planRenewalReminders(subscriptions, new Date())) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminder.body,
        data: { subscriptionId: reminder.subscriptionId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.fireAt,
        channelId: ANDROID_CHANNEL_ID,
      },
    });
  }
}

/**
 * Flip the toggle, asking for permission on first enable. Returns the state
 * that actually stuck — `false` when the user refused, so the caller can leave
 * the switch off instead of lying about it.
 *
 * Android 13+ needs the same runtime prompt (POST_NOTIFICATIONS); the
 * expo-notifications config plugin declares it.
 */
export async function setRenewalRemindersEnabled(
  enabled: boolean,
  subscriptions: RenewalInput[],
): Promise<boolean> {
  if (enabled) {
    const { granted } = await Notifications.getPermissionsAsync();
    if (!granted) {
      const requested = await Notifications.requestPermissionsAsync();
      if (!requested.granted) return false;
    }
  }

  deviceFlags.set(ENABLED_KEY, enabled);
  await syncRenewalReminders(subscriptions);
  return enabled;
}

/**
 * Drop every pending reminder without touching the preference. For sign-out:
 * another account's renewals should not keep surfacing on the lock screen.
 */
export async function cancelRenewalReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
