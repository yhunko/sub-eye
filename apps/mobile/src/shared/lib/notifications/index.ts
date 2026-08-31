import {
  effectiveSettings,
  planReminders,
  REMINDER_BUDGET,
  type ReminderInput,
  type ReminderKind,
  type ReminderSchedule,
  type ReminderSettings,
  type ReminderTarget,
} from "@subeye/reminders";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { m } from "@/shared/i18n";
import { reminderCopy } from "./copy";
import { readNotificationSettings } from "./settings";
import { createSettleBarrier } from "./settle-barrier";
import { repeatsForever, triggerTime } from "./trigger-time";

/**
 * Reminders, scheduled **entirely on the device**. No push tokens, no APNs/FCM,
 * no server endpoint, no DB row, no cron: the notification set is a pure
 * function of the subscription list the app already holds in its MMKV-persisted
 * query cache, so nothing round-trips.
 *
 * The whole schedule is rebuilt wholesale — cancel all, recompute, re-schedule —
 * on every foreground. That is idempotent by construction: no reconciliation, no
 * stored notification ids, and no way for the device to drift out of sync with
 * the list or with the settings.
 */

export {
  DEFAULT_REMINDER_SETTINGS,
  effectiveSettings,
  FREE_LEAD_DAYS,
  LEAD_DAY_CHOICES,
  type ReminderInput,
  type ReminderSettings,
  type ReminderTarget,
  toggleLeadDay,
} from "@subeye/reminders";
export {
  readNotificationSettings,
  writeNotificationSettings,
} from "./settings";

/** The stored settings with the Pro gate already applied, for callers that
 * only hold `isPro` and have no reason to touch storage themselves. */
export const readEffectiveSettings = (isPro: boolean): ReminderSettings =>
  effectiveSettings(readNotificationSettings(), isPro);

/**
 * Android 8+ shows NOTHING without a channel — not an error, just silence.
 *
 * One per kind rather than one for the app: a channel is the unit Android lets
 * the user tune in system settings, so this is what makes "trial warnings only"
 * expressible without SubEye shipping the control itself.
 */
const CHANNELS: Record<ReminderKind, string> = {
  renewal: "renewals",
  trialEnd: "trials",
};

// Without a handler, a reminder that fires while the app is open is swallowed.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureChannels(): Promise<void> {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(CHANNELS.renewal, {
    name: m.settings_renewalReminders(),
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  await Notifications.setNotificationChannelAsync(CHANNELS.trialEnd, {
    name: m.notifs_trialReminders(),
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * The OS trigger for a planned schedule: a one-shot instant, or a recurrence the
 * OS re-fires forever without the app ever being opened again.
 *
 * Every component passes through UNCHANGED. `RepeatRule` is already expressed in
 * expo's own ranges — `weekday` 1–7 from Sunday, `day` 1-based, `month` 0-based
 * — so a conversion here would be an off-by-one, not a fix.
 */
function triggerFor(
  schedule: ReminderSchedule,
  channelId: string,
): Notifications.NotificationTriggerInput {
  if (!schedule.repeats) {
    return {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: schedule.fireAt,
      channelId,
    };
  }

  const { rule } = schedule;
  switch (rule.unit) {
    case "daily":
      return {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: rule.hour,
        minute: rule.minute,
        channelId,
      };
    case "weekly":
      return {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: rule.weekday,
        hour: rule.hour,
        minute: rule.minute,
        channelId,
      };
    case "monthly":
      return {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: rule.day,
        hour: rule.hour,
        minute: rule.minute,
        channelId,
      };
    case "yearly":
      return {
        type: Notifications.SchedulableTriggerInputTypes.YEARLY,
        month: rule.month,
        day: rule.day,
        hour: rule.hour,
        minute: rule.minute,
        channelId,
      };
  }
}

/**
 * Bumped by every `syncReminders` call so an in-flight one can tell it has been
 * superseded. A module variable rather than a lock: the newest settings always
 * win, and making an obsolete run wait to finish would only delay the truth.
 */
let syncGeneration = 0;

/**
 * Whether the last rebuild had more reminder mornings than it could schedule.
 *
 * Measured, not inferred from the pending count: `pending.length >=
 * REMINDER_BUDGET` also claimed a truncation over an exactly-full plan that
 * dropped nothing, and again whenever a pending test notification made up the
 * difference. An untruthful status line is worse than none — degrade to the count.
 */
let planTruncated = false;

/**
 * Keeps `readNotificationHealth` from sampling the pending list mid-rebuild.
 * A rebuild cancels everything before it schedules anything, so a read landing
 * inside that window returns zero over a schedule that is about to exist.
 */
const syncBarrier = createSettleBarrier();

/**
 * Ask for permission if the OS will still let us. Returns whether we have it.
 *
 * `denied` is terminal on iOS: `requestPermissionsAsync` then resolves to
 * `denied` without ever showing a prompt, and the only route back is
 * `Linking.openSettings()`.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/**
 * Rebuild the pending schedule. Safe to call at any time, any number of times.
 *
 * Takes the settings ALREADY GATED — run them through `effectiveSettings` — so
 * this never has to know what Pro is. `shared/` cannot import `entities/pro`
 * without an upward FSD edge, and reading the entitlement here would put the
 * gate in a second place. `readEffectiveSettings` is the one-liner for callers
 * that only hold `isPro`.
 */
export function syncReminders(
  subscriptions: readonly ReminderInput[],
  settings: ReminderSettings,
): Promise<void> {
  return syncBarrier.track(rebuild(subscriptions, settings));
}

async function rebuild(
  subscriptions: readonly ReminderInput[],
  settings: ReminderSettings,
): Promise<void> {
  const generation = ++syncGeneration;
  const current = () => generation === syncGeneration;

  await Notifications.cancelAllScheduledNotificationsAsync();
  planTruncated = false;

  if (!settings.renewals && !settings.trials) return;

  // Permission can be revoked in OS Settings long after the switch was set. Stop
  // scheduling, but keep the preference — the screen surfaces the denied state
  // and the schedule comes back on its own if permission is restored.
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted || !current()) return;

  await ensureChannels();

  // Asked for one more than can be scheduled: getting it back is the only
  // evidence that anything was actually dropped.
  const plan = planReminders(
    subscriptions,
    settings,
    new Date(),
    reminderCopy,
    REMINDER_BUDGET + 1,
  );
  planTruncated = plan.length > REMINDER_BUDGET;

  for (const reminder of plan.slice(0, REMINDER_BUDGET)) {
    // Checked EVERY iteration, not once at the top. Scheduling is up to 56
    // awaited native calls, and the settings screen can start a second sync in
    // the middle of them: that run's cancel-all wipes what this one has written
    // so far, and without this guard the rest of this loop then lands *after*
    // it, leaving the device holding a mix of two settings.
    if (!current()) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminder.body,
        data: { target: reminder.target },
      },
      trigger: triggerFor(reminder.schedule, CHANNELS[reminder.kind]),
    });
  }
}

export type NotificationHealth = {
  granted: boolean;
  /** The OS has refused and will not ask again — Settings is the only way back. */
  blocked: boolean;
  /** Android only: a channel the user muted. `granted` stays true and nothing shows. */
  muted: boolean;
  scheduled: number;
  /**
   * How many of `scheduled` the OS re-fires on its own, forever.
   *
   * Without it the count reads as a countdown — "12 scheduled, then silence" —
   * which is what the schedule used to be and is the thing Plan C removed.
   */
  repeating: number;
  nextFireAt: Date | null;
  /** The plan hit the iOS ceiling, so the furthest-out reminders were dropped. */
  atBudget: boolean;
};

/**
 * What the screen's status section reports — measured, not assumed.
 *
 * The scheduled count and next fire time come from the OS's own pending list,
 * which is the only evidence that the whole path works. A muted Android channel
 * is the failure worth spelling out: permission reads as granted and absolutely
 * nothing appears.
 */
export async function readNotificationHealth(): Promise<NotificationHealth> {
  await syncBarrier.settled();

  const [permission, pending] = await Promise.all([
    Notifications.getPermissionsAsync(),
    Notifications.getAllScheduledNotificationsAsync(),
  ]);

  const now = Date.now();
  const times = pending
    .map((request) => triggerTime(request.trigger, now))
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);

  let muted = false;
  if (Platform.OS === "android" && permission.granted) {
    const channels = await Promise.all(
      Object.values(CHANNELS).map((id) =>
        Notifications.getNotificationChannelAsync(id),
      ),
    );
    muted = channels.some(
      (channel) =>
        channel !== null &&
        channel.importance === Notifications.AndroidImportance.NONE,
    );
  }

  return {
    granted: permission.granted,
    blocked: !permission.granted && !permission.canAskAgain,
    muted,
    scheduled: pending.length,
    repeating: pending.filter((request) => repeatsForever(request.trigger))
      .length,
    nextFireAt: times[0] === undefined ? null : new Date(times[0]),
    atBudget: planTruncated,
  };
}

/**
 * Fire one in five seconds. The only check that proves the entire path —
 * permission, channel, handler, Focus filters — rather than the parts of it the
 * app can see. The next `syncReminders` cancels it along with everything else,
 * which is harmless: by then it has already fired.
 */
export async function sendTestNotification(): Promise<boolean> {
  if (!(await ensureNotificationPermission())) return false;
  await ensureChannels();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: m.notifs_testTitle(),
      body: m.notifs_testBody(),
      data: { target: { screen: "list" } satisfies ReminderTarget },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      repeats: false,
      channelId: CHANNELS.renewal,
    },
  });
  return true;
}

/**
 * Drop every pending reminder without touching the settings. For sign-out:
 * another account's renewals should not keep surfacing on the lock screen.
 */
export async function cancelReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * The target carried by a tapped notification, or null.
 *
 * Validated rather than cast: this comes back out of the OS's own notification
 * store, so it can have been written by an older build with a different shape.
 */
function parseTarget(data: unknown): ReminderTarget | null {
  if (!data || typeof data !== "object") return null;
  const target = (data as { target?: unknown }).target;
  if (!target || typeof target !== "object") return null;

  const { screen, id, date } = target as Record<string, unknown>;
  if (screen === "subscription" && typeof id === "string") {
    return { screen, id };
  }
  if (screen === "due" && typeof date === "string") return { screen, date };
  if (screen === "list") return { screen };
  return null;
}

/**
 * Calls `onTarget` once for each reminder the user taps.
 *
 * `useLastNotificationResponse`, NOT `addNotificationResponseReceivedListener`:
 * the listener only fires while the app is already running, and a reminder is
 * most often tapped from a lock screen with the app killed — which is exactly
 * the case the listener misses. The hook replays the launching response instead.
 *
 * It also keeps replaying the SAME response across re-renders and remounts, so
 * the identifier guard is what stops one tap from navigating repeatedly.
 */
export function useReminderTap(
  onTarget: (target: ReminderTarget) => void,
): void {
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  const handler = useRef(onTarget);
  handler.current = onTarget;

  useEffect(() => {
    if (!response) return;

    const id = response.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;

    const target = parseTarget(response.notification.request.content.data);
    if (target) handler.current(target);
  }, [response]);
}
