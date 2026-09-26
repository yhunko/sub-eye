import { useRouter } from "expo-router";
import type { AndroidSymbol, SFSymbol } from "expo-symbols";
import { useCallback, useEffect, useState } from "react";
import { AppState, Linking, ScrollView, StyleSheet } from "react-native";
import { getLocale, m } from "@/shared/i18n";
import {
  type NotificationHealth,
  type ReminderSettings,
  readNotificationHealth,
  sendTestNotification,
} from "@/shared/lib/notifications";
import { Divider, PageFootnote, Row, Section } from "@/shared/ui/list-row";
import { colors } from "@/shared/ui/theme";
import { useReminderSettings } from "../model/use-reminder-settings";
import { LeadDayRows, TimeRow } from "./reminder-controls";

/**
 * Built per call from the APP's locale, never once at module scope — a
 * formatter constructed at import freezes whatever locale was active then.
 */
const nextFireFormat = () =>
  new Intl.DateTimeFormat(getLocale(), {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

type Status = {
  ios: SFSymbol;
  android: AndroidSymbol;
  /** The OS permission — which is the question "Status" actually answers. */
  value: string;
  /** Second line: what is on the schedule right now. */
  subtitle?: string;
  footnote?: string;
  /** The OS is the only place this can be fixed. */
  needsDeviceSettings: boolean;
};

/** What is on the schedule, for the row's second line. */
function scheduleSummary(
  health: NotificationHealth,
  settings: ReminderSettings,
): string {
  if (!settings.renewals && !settings.trials) return m.notifs_summaryOff();
  if (health.scheduled === 0) return m.notifs_summaryNone();

  // The COUNT is the primary signal and must never hinge on reading a trigger's
  // date back — that shape is platform-specific and was wrong once already.
  // Losing the time degrades the line; it does not turn it into a lie.
  if (!health.nextFireAt) {
    return m.notifs_summaryCount({ count: health.scheduled });
  }

  return m.notifs_summaryNext({
    count: health.scheduled,
    when: nextFireFormat().format(health.nextFireAt),
  });
}

/**
 * The status row reports the OS PERMISSION, not whether the switches below are
 * on — the switches say that themselves, and permission is the one part of the
 * chain this app cannot see from its own state. What is scheduled rides along
 * as the subtitle.
 *
 * Ordered by how broken things are: a refusal first, then a silenced channel,
 * then never-asked, then working.
 */
function describeStatus(
  health: NotificationHealth | null,
  settings: ReminderSettings,
): Status {
  if (!health) {
    return {
      ios: "bell",
      android: "notifications",
      value: m.notifs_permChecking(),
      needsDeviceSettings: false,
    };
  }

  if (health.blocked) {
    return {
      ios: "bell.slash",
      android: "notifications_off",
      value: m.notifs_permDenied(),
      footnote: m.notifs_permDeniedHint(),
      needsDeviceSettings: true,
    };
  }

  // Android only, and the quiet one: permission reads as granted and nothing
  // whatsoever appears, because the user silenced the channel in system settings.
  if (health.muted) {
    return {
      ios: "bell.badge.slash",
      android: "notifications_paused",
      value: m.notifs_permSilenced(),
      footnote: m.notifs_permSilencedHint(),
      needsDeviceSettings: true,
    };
  }

  if (!health.granted) {
    return {
      ios: "bell.badge",
      android: "notifications_active",
      value: m.notifs_permAsk(),
      footnote: m.notifs_permAskHint(),
      needsDeviceSettings: false,
    };
  }

  return {
    ios: "checkmark.circle",
    android: "check_circle",
    value: m.notifs_permAllowed(),
    subtitle: scheduleSummary(health, settings),
    // A count on its own reads as a countdown — "12, then silence" — which is
    // what the schedule used to be. Truncation still outranks the reassurance:
    // it is the only one of the two the user can act on.
    footnote: health.atBudget
      ? m.notifs_atBudget()
      : health.repeating > 0
        ? m.notifs_repeats()
        : undefined,
    needsDeviceSettings: false,
  };
}

/**
 * Reminder configuration, on its own screen.
 *
 * Everything here is DEVICE-local — the settings, the schedule, and the OS
 * permission that gates both. Nothing round-trips, so the screen stays correct
 * offline and a second phone is configured separately.
 *
 * Free keeps renewal reminders, the time of day, and this whole status section:
 * the gate must never sit between "warned" and "not warned", and paywalling
 * "is it working?" is a support ticket, not revenue. Pro buys extra lead times
 * and trial-ending warnings.
 */
export function NotificationsPage() {
  const router = useRouter();
  const [health, setHealth] = useState<NotificationHealth | null>(null);
  const [testing, setTesting] = useState(false);

  const refresh = useCallback(() => {
    void readNotificationHealth().then(setHealth);
  }, []);

  // Everything about the settings themselves — the Pro gate, permission-first
  // writes, rebuilding the schedule — is `useReminderSettings`, shared with the
  // offer sheet. This screen owns only what the sheet has no use for: the OS
  // health readout and the test notification.
  const { settings, view, isPro, busy, apply, enable, toggleLead } =
    useReminderSettings(refresh);

  // Permission and channel state can change while we are backgrounded — this
  // screen is what sends the user to the OS settings in the first place — so
  // re-read on every foreground, not only on mount.
  useEffect(() => {
    refresh();
    const listener = AppState.addEventListener("change", (status) => {
      if (status === "active") refresh();
    });
    return () => listener.remove();
  }, [refresh]);

  // A refusal needs no alert: `refresh` flips the status row above to the
  // denied state, which says more than a dialog would and stays on screen.
  const test = async () => {
    setTesting(true);
    await sendTestNotification();
    setTesting(false);
    refresh();
  };

  const status = describeStatus(health, view);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <Section title={m.notifs_status()} footnote={status.footnote}>
        <Row
          ios={status.ios}
          android={status.android}
          label={m.notifs_permission()}
          value={status.value}
          subtitle={status.subtitle}
        />
        {status.needsDeviceSettings ? (
          <>
            <Divider />
            <Row
              ios="gearshape"
              android="settings"
              label={m.settings_openDeviceSettings()}
              accent
              onPress={() => void Linking.openSettings()}
            />
          </>
        ) : null}
        <Divider />
        <Row
          ios="paperplane"
          android="send"
          label={m.notifs_sendTest()}
          accent
          onPress={busy || testing ? undefined : () => void test()}
        />
      </Section>

      <Section
        title={m.notifs_renewals()}
        footnote={m.notifs_timeHint({
          zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        })}
      >
        <Row
          ios="arrow.triangle.2.circlepath"
          android="autorenew"
          label={m.notifs_renewalSwitch()}
          toggle={{
            value: view.renewals,
            disabled: busy,
            onValueChange: (next) => void enable({ renewals: next }, next),
          }}
        />
        <Divider />
        <TimeRow
          hour={settings.hour}
          minute={settings.minute}
          onChange={(hour, minute) => apply({ hour, minute })}
        />
      </Section>

      {view.renewals ? (
        <Section
          title={m.notifs_remindMe()}
          footnote={isPro ? m.notifs_leadHint() : m.notifs_leadHintFree()}
        >
          <LeadDayRows
            selected={view.renewalLeadDays}
            locked={!isPro}
            onToggle={(day) => toggleLead("renewalLeadDays", day)}
          />
        </Section>
      ) : null}

      <Section title={m.notifs_trials()} footnote={m.notifs_trialsHint()}>
        <Row
          ios="hourglass"
          android="hourglass_empty"
          label={m.notifs_trialSwitch()}
          value={isPro ? undefined : m.paywall_badge()}
          toggle={
            isPro
              ? {
                  value: view.trials,
                  disabled: busy,
                  onValueChange: (next) => void enable({ trials: next }, next),
                }
              : undefined
          }
          // Without a switch the row has to do something, or the Pro badge sits
          // next to a control that cannot be operated and reads as broken.
          onPress={isPro ? undefined : () => router.push("/paywall")}
        />
        {view.trials ? (
          <>
            <Divider />
            <LeadDayRows
              selected={view.trialLeadDays}
              locked={!isPro}
              onToggle={(day) => toggleLead("trialLeadDays", day)}
            />
          </>
        ) : null}
      </Section>

      <PageFootnote>{m.notifs_deviceNote()}</PageFootnote>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // The gap between SECTIONS. Each section already owns the tight spacing
  // between its own heading, card and footnote.
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 26,
    backgroundColor: colors.bg,
  },
});
