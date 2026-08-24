import { CurrencyUtils } from "@subeye/money";
import type { Ports } from "./ports";
import type { PreferencesRecord } from "./records";

export const readPreferences = (ports: Ports): Promise<PreferencesRecord> =>
  ports.preferences.read();

export const writePreferences = (
  ports: Ports,
  patch: Partial<PreferencesRecord>,
): Promise<PreferencesRecord> =>
  ports.preferences.write(
    // Normalized on the way in, never on the way out: the code is compared
    // against a rate table keyed in lowercase, and a stored "EUR" silently
    // disables conversion for that account.
    patch.preferredCurrency === undefined
      ? patch
      : {
          ...patch,
          preferredCurrency: CurrencyUtils.normalizeCode(
            patch.preferredCurrency,
          ),
        },
  );
