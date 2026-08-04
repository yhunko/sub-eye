import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { deviceFlags } from "@/shared/lib/mmkv";
import { preferencesQuery, useUpdatePreferences } from "./preferences";

/** `usersTable.timezone` defaults to this for every new account. */
const SERVER_DEFAULT_TIMEZONE = "UTC";

const seededKey = (userId: string) => `timezone.seeded.${userId}`;

/**
 * Adopts the device's timezone once, for a brand-new account.
 *
 * The account's timezone is what the server measures a calendar day against —
 * when a pause resumes, when a cancellation takes effect, which month a charge
 * lands in. Left on `UTC` those boundaries fall at 00:00 UTC, which is three
 * hours into the user's day in Kyiv and the *previous evening* west of UTC.
 * Nothing else in the app ever sets it: there is a "match device" row in
 * Settings, and until someone taps it every one of those transitions is
 * measured somewhere the user does not live.
 *
 * Three guards, and the third is the one that differs from
 * [`useSeedPreferredCurrency`]:
 *
 * 1. An MMKV flag, set on the first run **whether or not anything changed** — a
 *    retry on a failed PATCH would be a second chance to overwrite a zone the
 *    user has since picked by hand.
 * 2. The stored value must still be the server default, so a deliberate choice
 *    is never overwritten by a second device.
 * 3. **The account must have no subscriptions yet.** Currency only re-denominates
 *    a display; a timezone moves the day boundaries that existing dates are
 *    already being measured against, so adopting one silently would shift the
 *    month totals and status transitions of an account that has been running on
 *    UTC. A new account has nothing to shift.
 */
export function useSeedPreferredTimezone(isEmptyAccount: boolean | undefined) {
  const { userId } = useAuth();
  const { data } = useQuery(preferencesQuery());
  // `mutate` is stable across renders; the mutation object is not, and depending
  // on it would re-run this effect on every render.
  const { mutate } = useUpdatePreferences();

  useEffect(() => {
    // `undefined` means the list has not loaded — not "no subscriptions". Wait
    // rather than seed, or a cold start races the cache and seeds an account
    // that turns out to have thirty subscriptions in it.
    if (!userId || !data || isEmptyAccount !== true) return;

    const key = seededKey(userId);
    if (deviceFlags.get(key)) return;
    deviceFlags.set(key, true);

    if (data.preferredTimezone !== SERVER_DEFAULT_TIMEZONE) return;

    const device = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!device || device === data.preferredTimezone) return;

    mutate({ preferredTimezone: device });
  }, [userId, data, isEmptyAccount, mutate]);
}
