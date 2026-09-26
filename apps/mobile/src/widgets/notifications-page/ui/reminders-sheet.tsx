import { useRouter } from "expo-router";
import { m } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";
import { Divider, Row, Section } from "@/shared/ui/list-row";
import { PromptSheet } from "@/shared/ui/prompt-sheet";
import { useReminderSettings } from "../model/use-reminder-settings";
import { LeadDayRows, TimeRow } from "./reminder-controls";

/**
 * The offer to turn reminders on, shown once, right after a subscription is
 * saved on an install that has never had them.
 *
 * It CONFIGURES rather than asks. The alert this replaced could only offer a
 * yes/no and then left the timing four taps deep in Settings, which meant the
 * one moment the user is thinking about reminders was the one moment they could
 * not act on it. The rows here are literally the settings screen's rows — same
 * hook, same components — so nothing has to be re-learned or re-found, and the
 * two surfaces cannot drift.
 *
 * THE COPY IS DOING REAL WORK. Reminder settings are per-device and apply to
 * every subscription, but this arrives seconds after the user saved ONE, so
 * without saying so outright it reads as a switch on that row — and the next
 * subscription they add goes unremindered while they believe otherwise. Hence
 * "for everything you track", and hence naming Settings, so the offer reads as
 * reversible rather than as a door closing.
 *
 * There is no "no thanks" button. Its whole content is a switch that is already
 * off, so doing nothing already declines; a second way to say the same thing
 * would only make the sheet look like it wanted an answer.
 */
export function RemindersSheet() {
  const router = useRouter();
  const { settings, view, isPro, busy, apply, enable, toggleLead } =
    useReminderSettings();

  return (
    <PromptSheet
      icon={{ ios: "bell.badge", android: "notifications_active" }}
      title={m.prompt_remindersTitle()}
      body={m.prompt_remindersBody()}
      actions={<Button label={m.common_done()} onPress={() => router.back()} />}
    >
      <Section>
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

      {/* Only once there is something to schedule. Above the switch these are
          rows that configure nothing, and the sheet would grow to hold them. */}
      {view.renewals ? (
        <Section title={m.notifs_remindMe()}>
          <LeadDayRows
            selected={view.renewalLeadDays}
            locked={!isPro}
            onToggle={(day) => toggleLead("renewalLeadDays", day)}
          />
        </Section>
      ) : null}
    </PromptSheet>
  );
}
