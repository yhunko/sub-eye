import { deviceFlags } from "./mmkv";
import { readNotificationSettings } from "./notifications/settings";

/**
 * What, if anything, the app says to the user unprompted — and the rule that
 * it says AT MOST ONE THING per session.
 *
 * Three things want the same moment: an offer to turn reminders on, one pitch
 * for Pro, and the App Store rating sheet. Left as independent components they
 * would each be individually reasonable and collectively a mugging — the worst
 * of them being a paywall followed immediately by "enjoying SubEye?", which is
 * a sequence no user reads as anything but a shakedown.
 *
 * The reminders offer is not decided here — it fires from the SAVE path — but
 * this function has to know it is pending, or it spends the session ahead of it.
 *
 * So the decision is made in one pure function, in a fixed priority, and the
 * caller fires exactly what it returns. Adding a fourth prompt means adding it
 * to this list and arguing for its position, which is the point.
 */

export type PromptKind = "pro" | "review";

const REMINDERS_ASKED = "prompts.remindersAsked";
const PRO_PITCHED = "prompts.proPitched";

/**
 * Three is where the pitch stops being a cold call. It is the same threshold
 * `review.ts` uses for "a user who has moved in", deliberately: two definitions
 * of an engaged user would drift the first time one of them was tuned.
 */
const MIN_TRACKED_FOR_PRO = 3;

export function nextPrompt(input: {
  tracked: number;
  isPro: boolean;
  proPitched: boolean;
  /** `reviewDue()` — every stored gate in `review.ts` is already open. */
  reviewDue: boolean;
  /** Something already interrupted this session. `promptSession.taken()`. */
  interrupted: boolean;
  /** `remindersOfferDue()` — the save path still owes the user that offer. */
  remindersPending: boolean;
}): PromptKind | null {
  if (input.interrupted) return null;

  // NOTHING FROM HOME WHILE THE REMINDERS OFFER IS STILL OWED, and this is not
  // a nicety — without it the offer can never fire at all. Home is the launch
  // tab, so its timer starts before the user has done anything; the pitch takes
  // the session's one interruption a second and a half in, and the offer, which
  // fires from the save path, then finds the session spent every time. Measured
  // on a fresh install with the flags cleared: `taken=true due=true`, save after
  // save, until the pitch had used itself up on some later launch.
  //
  // The order is right on its own terms too. The offer is the only prompt that
  // GIVES the user something, and it is attached to an action they take
  // themselves; an ambient ask for money can wait a launch.
  if (input.remindersPending) return null;

  // Once, ever. Every other route to the paywall is reactive — the user has to
  // bump into a lock — so someone who adds two subscriptions and leaves may
  // never see it at all. That is one ask, not a campaign.
  if (
    !input.isPro &&
    !input.proPitched &&
    input.tracked >= MIN_TRACKED_FOR_PRO
  ) {
    return "pro";
  }

  // LAST. Its own gates already require a week of use, by which time the two
  // above have long since fired or been declined.
  return input.reviewDue ? "review" : null;
}

/**
 * Whether the reminders offer is due, asked by the subscription form as it
 * saves. Reads the settings rather than taking them, because the form has no
 * reason to know what a `ReminderSettings` is.
 */
export function remindersOfferDue(): boolean {
  if (promptFlags.remindersAsked()) return false;
  const settings = readNotificationSettings();
  return !settings.renewals && !settings.trials;
}

/**
 * At most ONE unprompted interruption per launch, across every surface that can
 * raise one. Module state, deliberately not persisted: it is a fact about this
 * run of the app, and a stored flag would silence the next launch too.
 *
 * Without it, saving a third subscription on a fresh install fires the reminders
 * sheet and then, once it closes, Home fires the Pro pitch — two interruptions
 * inside five seconds, which is exactly the mugging the priority order exists
 * to prevent.
 */
let interrupted = false;

export const promptSession = {
  taken: () => interrupted,
  take: () => {
    interrupted = true;
  },
  /**
   * DEV RIG ONLY, and deliberately NOT wired into `promptFlags.reset()`.
   *
   * That reset has a second caller — Settings → Erase all data — and re-arming
   * the session there would reintroduce the exact sequence this boolean exists
   * to prevent: pitch shown, user erases, user adds a subscription, reminders
   * sheet. Two unprompted interruptions in one launch.
   *
   * The developer row calls this so that "Reset both prompts" is true as
   * written. Without it the row cleared the two stored flags and left the
   * session spent, so the next save did nothing and the only way through was a
   * relaunch — a caveat buried in an alert nobody reads twice.
   */
  reset: () => {
    interrupted = false;
  },
};

export const promptFlags = {
  remindersAsked: () => deviceFlags.get(REMINDERS_ASKED),
  markRemindersAsked: () => deviceFlags.set(REMINDERS_ASKED, true),
  proPitched: () => deviceFlags.get(PRO_PITCHED),
  markProPitched: () => deviceFlags.set(PRO_PITCHED, true),
  /**
   * Both flags, forgotten. Called by "Erase all data", which puts the install
   * back to a first run in every other respect — a surviving `remindersAsked`
   * would mean a user who wiped and started over is never offered reminders
   * again, silently and forever.
   *
   * The review clock deliberately does NOT reset with it: how long the app has
   * been installed is not something an erase changes, and re-arming the rating
   * ask would let a wipe buy another one of the three iOS allows per year.
   */
  reset: () => {
    deviceFlags.set(REMINDERS_ASKED, false);
    deviceFlags.set(PRO_PITCHED, false);
  },
};
