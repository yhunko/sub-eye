import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";
import { getLocales } from "expo-localization";
import { useEffect } from "react";
import { supportedCurrencyCode } from "@/shared/lib/format";
import { deviceFlags } from "@/shared/lib/mmkv";
import { preferencesQuery, useUpdatePreferences } from "./preferences";

/**
 * `usersTable.preferredCurrency` defaults to "uah" for everyone, so without this
 * a user in Berlin meets their first Home screen denominated in hryvnia.
 *
 * Kept in step by hand rather than imported: `CurrencyUtils.DEFAULT_CURRENCY_CODE`
 * lives in @subeye/money, and one string does not justify a package edge the
 * mobile app otherwise has no reason to carry.
 */
const SERVER_DEFAULT_CURRENCY = "uah";

const seededKey = (userId: string) => `currency.seeded.${userId}`;

/**
 * Adopts the device region's currency once per account, per device.
 *
 * Two guards, and both are load-bearing:
 *
 * 1. An MMKV flag, set on the first run **whether or not anything changed**. A
 *    retry on a failed PATCH would be a second chance to overwrite a currency
 *    the user has since picked by hand.
 * 2. The stored preference must still be the server default. `deviceFlags` is
 *    per-install, so signing in on a second phone starts with the flag unset —
 *    without this clause, a user who chose USD in Berlin would be silently
 *    re-denominated to EUR by their new device.
 *
 * The residual case is a user who deliberately chooses UAH and then installs on
 * a device in another region. They get that region's currency once, and two taps
 * in Settings undo it.
 */
export function useSeedPreferredCurrency() {
  const { userId } = useAuth();
  const { data } = useQuery(preferencesQuery());
  // `mutate` is stable across renders; the mutation object is not, and depending
  // on it would re-run this effect on every render.
  const { mutate } = useUpdatePreferences();

  useEffect(() => {
    if (!userId || !data) return;

    const key = seededKey(userId);
    if (deviceFlags.get(key)) return;
    deviceFlags.set(key, true);

    if (data.preferredCurrency !== SERVER_DEFAULT_CURRENCY) return;

    const device = supportedCurrencyCode(getLocales()[0]?.currencyCode);
    if (!device || device === data.preferredCurrency) return;

    mutate({ preferredCurrency: device });
  }, [userId, data, mutate]);
}
