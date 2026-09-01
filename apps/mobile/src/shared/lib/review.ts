import * as StoreReview from "expo-store-review";
import { Platform } from "react-native";
import { deviceJson } from "./mmkv";

/**
 * When the app may ask for an App Store rating, and where an explicit "Rate
 * SubEye" tap goes.
 *
 * The ask is the OS sheet (`SKStoreReviewController`) and nothing else. There
 * is deliberately NO "Enjoying SubEye?" dialog in front of it: a pre-prompt is
 * the nagging half of that pattern — a modal the user must answer to get back
 * to what they were doing — and it buys nothing the gates below do not already
 * buy. The OS sheet cannot be made modal, dismisses on a tap outside, and iOS
 * caps it at three appearances per user per year on its own.
 *
 * The gates here are what stop the app spending those three on someone who has
 * no reason to say anything yet.
 *
 * `expo-store-review` IS PINNED TO AN EXACT 57.0.1 — do not widen it to `~`.
 * 57.0.2 calls `SceneGeometry.foregroundScene()`, which does not exist in
 * `expo-modules-core` 57.0.6 (the version `expo@57.0.7` resolves), so the pod
 * fails to compile: `cannot find 'SceneGeometry' in scope`, in Swift, at native
 * build time. Nothing in `type-check`, `test` or `lint` can see it — the first
 * signal is a dead `xcodebuild`. 57.0.1 reads `UIApplication.shared
 * .connectedScenes` directly and needs nothing from expo-modules-core.
 */

const STATE_KEY = "review.state";

type ReviewState = {
  /**
   * The first foreground where the app had a populated dashboard to show —
   * install time, near enough. It is written on the first run that gets here
   * and read on every later one, which is why nothing can be asked on day one:
   * there is nothing to measure the wait against yet.
   */
  firstSeenAt: number;
  /** When the OS sheet was last requested. 0 = never. */
  askedAt: number;
};

const NEVER: ReviewState = { firstSeenAt: 0, askedAt: 0 };

const DAY_MS = 24 * 60 * 60 * 1000;

/** A week of ordinary use before an install is asked anything at all. */
const SETTLING_DAYS = 7;

/**
 * Below this the app has not yet done the job someone would be rating. One
 * subscription is a user trying the app out; three is a user who has moved in.
 */
const MIN_TRACKED = 3;

/**
 * What keeps every RELEASE from spending one of the three asks iOS allows in a
 * year. Without it the version-shipping cadence becomes the prompt cadence,
 * which is the nagging this is built to avoid.
 */
const COOLDOWN_DAYS = 180;

export function shouldAskForReview(
  state: ReviewState,
  { now, tracked }: { now: number; tracked: number },
): boolean {
  if (state.firstSeenAt === 0) return false;
  if (tracked < MIN_TRACKED) return false;
  if (now - state.firstSeenAt < SETTLING_DAYS * DAY_MS) return false;
  return state.askedAt === 0 || now - state.askedAt >= COOLDOWN_DAYS * DAY_MS;
}

/**
 * Start the clock on a fresh install. Cheap, idempotent, safe on every focus.
 *
 * Split from the ask because `HomePrompts` may decide something else is more
 * worth saying this session — but the clock has to start regardless, or an
 * install that spends its first week being told other things would restart its
 * settling period every time.
 */
export function touchReviewClock(): void {
  const state = deviceJson.get<ReviewState>(STATE_KEY, NEVER);
  if (state.firstSeenAt === 0) {
    deviceJson.set(STATE_KEY, { ...state, firstSeenAt: Date.now() });
  }
}

/** Whether every stored gate is open. The caller still decides if it is polite. */
export function reviewDue(tracked: number): boolean {
  return shouldAskForReview(deviceJson.get<ReviewState>(STATE_KEY, NEVER), {
    now: Date.now(),
    tracked,
  });
}

/** Show the OS sheet, and spend the cooldown whether or not iOS draws it. */
export async function askForReview(): Promise<void> {
  try {
    // False on TestFlight and on Android below 5.0 — so a build that cannot
    // show the sheet must not burn the cooldown pretending it did. It also
    // means this path CANNOT be verified from a TestFlight build; only from a
    // debug build with the constants above lowered, or from the App Store.
    if (!(await StoreReview.isAvailableAsync())) return;

    // Recorded BEFORE the call: a rejected request — or one iOS swallows
    // because its own quota is spent — must not re-arm on the next focus.
    const state = deviceJson.get<ReviewState>(STATE_KEY, NEVER);
    deviceJson.set(STATE_KEY, { ...state, askedAt: Date.now() });
    await StoreReview.requestReview();
  } catch {
    // A rating sheet that fails to appear is not a bug worth reporting, and
    // there is nothing the user could do about it.
  }
}

/**
 * Where the Settings row sends someone who went looking for it.
 *
 * NOT `requestReview()`. That sheet is rate-limited and shows *nothing at all*
 * once its quota is spent, so a button wired to it is a button that silently
 * does nothing for exactly the people who press it. `action=write-review` opens
 * the App Store's review composer, which is what the row promises.
 *
 * Android is `null` because there is no Play listing to send anyone to yet —
 * the row hides itself rather than opening a store page for an app that is not
 * on that store.
 */
export function reviewUrl(): string | null {
  return Platform.OS === "ios"
    ? "https://apps.apple.com/app/id6795566917?action=write-review"
    : null;
}
