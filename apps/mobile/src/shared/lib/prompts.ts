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
}): PromptKind | null {
  // The reminders offer does not appear here at all: it fires from the SAVE
  // path, seconds after a subscription is written, because that is the one
  // moment the user is actually thinking about being reminded. It still counts
  // against this session — hence the guard.
  if (input.interrupted) return null;

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
