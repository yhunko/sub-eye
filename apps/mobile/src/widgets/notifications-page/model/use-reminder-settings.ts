import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePro } from "@/entities/pro";
import { subscriptionsQuery } from "@/entities/subscription";
import {
  effectiveSettings,
  ensureNotificationPermission,
  type ReminderSettings,
  readNotificationSettings,
  syncReminders,
  toggleLeadDay,
  writeNotificationSettings,
} from "@/shared/lib/notifications";

/**
 * Reminder configuration as a piece of state, so the settings screen and the
 * offer sheet are the same feature twice rather than two implementations of it.
 *
 * Everything subtle about reminders lives here rather than in either caller:
 * permission is asked BEFORE the setting is written, the schedule is rebuilt
 * whenever the settings or the list move, and the Pro gate is applied through
 * `effectiveSettings` in exactly one place. A second copy of any of those is
 * how a switch starts reading "on" over a schedule that will never be built.
 *
 * `onChange` exists for the screen's health readout, which has to re-sample the
 * OS after every write. The sheet has no such section and passes nothing.
 */
export function useReminderSettings(onChange?: () => void) {
  const router = useRouter();
  const isPro = usePro();
  const subscriptions = useQuery(subscriptionsQuery());
  const [settings, setSettings] = useState(readNotificationSettings);
  const [busy, setBusy] = useState(false);

  const subscriptionData = subscriptions.data;

  // Memoised so the effect below has a stable dependency: for a free install
  // `effectiveSettings` returns a fresh object, and an unmemoised one would
  // rebuild the entire schedule on every render.
  const view = useMemo(
    () => effectiveSettings(settings, isPro),
    [settings, isPro],
  );

  // Held in a ref so the effect below can call the latest one WITHOUT depending
  // on it: callers pass an inline closure, and a dependency on that would
  // rebuild the entire notification schedule on every render of the screen.
  const notify = useRef(onChange);
  notify.current = onChange;

  useEffect(() => {
    if (!subscriptionData) return;
    void syncReminders(subscriptionData, view).then(() => notify.current?.());
  }, [view, subscriptionData]);

  const apply = (patch: Partial<ReminderSettings>) =>
    setSettings(writeNotificationSettings(patch));

  /**
   * Turning something ON asks the OS first. Writing the setting and *then*
   * being refused leaves a switch that reads "on" over a schedule that will
   * never be built — the one failure the status section exists to explain.
   * Turning something off needs no permission and must never be blocked by one.
   */
  const enable = async (patch: Partial<ReminderSettings>, next: boolean) => {
    if (!next) {
      apply(patch);
      return;
    }

    setBusy(true);
    const allowed = await ensureNotificationPermission();
    setBusy(false);
    onChange?.();
    if (allowed) apply(patch);
  };

  /** The free tier has exactly one lead time, so every other row is the paywall. */
  const toggleLead = (
    key: "renewalLeadDays" | "trialLeadDays",
    day: number,
  ) => {
    if (!isPro) {
      router.push("/paywall");
      return;
    }
    apply({ [key]: toggleLeadDay(settings[key], day) });
  };

  return { settings, view, isPro, busy, apply, enable, toggleLead };
}
