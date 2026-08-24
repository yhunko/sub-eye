import type { ReminderCopy } from "@subeye/reminders";
import { m } from "@/shared/i18n";
import { formatMoney } from "@/shared/lib/format";

/** The one place reminder copy is rendered — the planner itself holds none. */
export const reminderCopy: ReminderCopy = {
  whenToday: m.notif_whenToday,
  whenTomorrow: m.notif_whenTomorrow,
  whenInDays: m.notif_whenInDays,
  renewalTitle: m.notif_renewalTitle,
  renewalBody: m.notif_renewalBody,
  renewalBodyNoAmount: m.notif_renewalBodyNoAmount,
  trialTitle: m.notif_trialTitle,
  trialBody: m.notif_trialBody,
  trialBodyNoAmount: m.notif_trialBodyNoAmount,
  renewalDigestTitle: m.notif_renewalDigestTitle,
  renewalDigestTitleMixed: m.notif_renewalDigestTitleMixed,
  trialDigestTitle: m.notif_trialDigestTitle,
  trialDigestTitleMixed: m.notif_trialDigestTitleMixed,
  digestBody: m.notif_digestBody,
  digestMore: m.notif_digestMore,
  money: formatMoney,
};
