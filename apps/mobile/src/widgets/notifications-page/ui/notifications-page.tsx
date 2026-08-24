import DateTimePicker from "@react-native-community/datetimepicker";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import type { AndroidSymbol, SFSymbol } from "expo-symbols";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  AppState,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { usePro } from "@/entities/pro";
import { subscriptionsQuery } from "@/entities/subscription";
import { getLocale, m } from "@/shared/i18n";
import {
  effectiveSettings,
  ensureNotificationPermission,
  LEAD_DAY_CHOICES,
  type NotificationHealth,
  type ReminderSettings,
  readNotificationHealth,
  readNotificationSettings,
  sendTestNotification,
  syncReminders,
  toggleLeadDay,
  writeNotificationSettings,
} from "@/shared/lib/notifications";
import {
  Divider,
  PageFootnote,
  Row,
  RowCheck,
  Section,
} from "@/shared/ui/list-row";
import { colors } from "@/shared/ui/theme";

/**
 * Built per call from the APP's locale, never once at module scope.
 *
 * The same trap as `m.someKey()` at module scope: a formatter constructed at
 * import freezes whatever locale was active then — and `undefined` resolves to
 * the *device* locale, which is not what the app is rendering. It put an
 * English "Aug 2 at 9:00 AM" in the middle of a Ukrainian sentence.
 */
const timeFormat = () =>
  new Intl.DateTimeFormat(getLocale(), { hour: "2-digit", minute: "2-digit" });

const nextFireFormat = () =>
  new Intl.DateTimeFormat(getLocale(), {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/** A Date carrying only a wall-clock time, for the picker to edit. */
const asClock = (hour: number, minute: number) =>
  new Date(2000, 0, 1, hour, minute);

const LEAD_LABELS: Record<number, () => string> = {
  0: m.notifs_leadSameDay,
  1: m.notifs_leadOneDay,
  3: m.notifs_leadThreeDays,
  7: m.notifs_leadOneWeek,
};

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
 * The time row. iOS renders the picker inline and compact, straight in the row;
 * Android has no inline form, so the row opens the system dialog and shows the
 * value itself.
 */
function TimeRow({
  hour,
  minute,
  onChange,
}: {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}) {
  const [androidOpen, setAndroidOpen] = useState(false);
  const value = asClock(hour, minute);
  const apply = (next: Date) => onChange(next.getHours(), next.getMinutes());

  if (Platform.OS === "ios") {
    return (
      <Row
        ios="clock"
        android="schedule"
        label={m.notifs_time()}
        accessory={
          <DateTimePicker
            value={value}
            mode="time"
            display="compact"
            themeVariant="dark"
            onValueChange={(_event, next) => apply(next)}
          />
        }
      />
    );
  }

  return (
    <>
      <Row
        ios="clock"
        android="schedule"
        label={m.notifs_time()}
        value={timeFormat().format(value)}
        onPress={() => setAndroidOpen(true)}
      />
      {androidOpen ? (
        <DateTimePicker
          value={value}
          mode="time"
          // Both handlers unmount the dialog, because only `onValueChange`
          // fires on a pick. Without `onDismiss` a cancelled dialog leaves
          // `androidOpen` true, and the row cannot be opened a second time.
          onValueChange={(_event, next) => {
            setAndroidOpen(false);
            apply(next);
          }}
          onDismiss={() => setAndroidOpen(false)}
        />
      ) : null}
    </>
  );
}

function LeadDayRows({
  selected,
  locked,
  onToggle,
}: {
  selected: number[];
  locked: boolean;
  onToggle: (day: number) => void;
}) {
  return (
    <>
      {LEAD_DAY_CHOICES.map((day, index) => {
        const checked = selected.includes(day);
        return (
          <Fragment key={day}>
            {index > 0 ? <Divider /> : null}
            <Row
              ios="calendar"
              android="event"
              label={LEAD_LABELS[day]?.() ?? String(day)}
              onPress={() => onToggle(day)}
              // The badge sits on the rows a free install cannot reach, not on
              // the one it already has — a "Pro" tag beside a live checkmark
              // would say the feature they are using is not theirs.
              value={locked && !checked ? m.paywall_badge() : undefined}
              accessory={<RowCheck checked={checked} />}
            />
          </Fragment>
        );
      })}
    </>
  );
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
  const isPro = usePro();
  const subscriptions = useQuery(subscriptionsQuery());
  const [settings, setSettings] = useState(readNotificationSettings);
  const [health, setHealth] = useState<NotificationHealth | null>(null);
  const [busy, setBusy] = useState(false);

  const subscriptionData = subscriptions.data;

  const refresh = useCallback(() => {
    void readNotificationHealth().then(setHealth);
  }, []);

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

  // Memoised so the effect below has a stable dependency: for a free install
  // `effectiveSettings` returns a fresh object, and an unmemoised one would
  // rebuild the entire schedule on every render.
  const view = useMemo(
    () => effectiveSettings(settings, isPro),
    [settings, isPro],
  );

  // Rebuild the schedule whenever the settings or the list change, then re-read
  // the health so the count on screen is the count the OS actually holds.
  useEffect(() => {
    if (!subscriptionData) return;
    void syncReminders(subscriptionData, view).then(refresh);
  }, [view, subscriptionData, refresh]);

  const apply = (patch: Partial<ReminderSettings>) =>
    setSettings(writeNotificationSettings(patch));

  const status = describeStatus(health, view);

  const enable = async (patch: Partial<ReminderSettings>, enabled: boolean) => {
    if (!enabled) {
      apply(patch);
      return;
    }

    setBusy(true);
    // Permission first: writing the setting and *then* being refused leaves a
    // switch that reads "on" over a schedule that will never be built.
    const allowed = await ensureNotificationPermission();
    setBusy(false);
    refresh();
    if (allowed) apply(patch);
  };

  // A refusal needs no alert: `refresh` flips the status row above to the
  // denied state, which says more than a dialog would and stays on screen.
  const test = async () => {
    setBusy(true);
    await sendTestNotification();
    setBusy(false);
    refresh();
  };

  const toggleLead = (
    key: "renewalLeadDays" | "trialLeadDays",
    day: number,
  ) => {
    // The free tier has exactly one lead time, so every row here is the paywall.
    if (!isPro) {
      router.push("/paywall");
      return;
    }
    apply({ [key]: toggleLeadDay(settings[key], day) });
  };

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
          onPress={busy ? undefined : () => void test()}
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
