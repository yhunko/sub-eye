import { deviceFlags } from "@/shared/lib/mmkv";

const KEY = "auth.signedIn";

/**
 * Last known sign-in state, read synchronously at the first render.
 *
 * Clerk's `isLoaded` is not a SecureStore read — it waits on a client handshake,
 * which is a network round-trip. Gating the tab tree on it left the app on a
 * black screen for as long as that took. This hint lets the tabs mount straight
 * away over the persisted Query cache; Clerk still has the final say the moment
 * it resolves.
 *
 * It is a HINT, never authorization: it says only "last time we looked, someone
 * was signed in", and every request is still authorized by a real Clerk token.
 * A stale `true` costs one redirect once Clerk resolves.
 */
export const sessionHint = {
  read: (): boolean => deviceFlags.get(KEY),
  write: (signedIn: boolean): void => deviceFlags.set(KEY, signedIn),
};
