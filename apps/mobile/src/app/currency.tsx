import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { preferencesQuery, useUpdatePreferences } from "@/entities/user";
import { CurrencyPage } from "@/widgets/currency-page";

// The seam between the preference and the shared picker, in the one layer
// allowed to know both — the same wiring `subscription-form/category/index.tsx`
// does for the category list. The picker knows nothing about preferences.
//
// A ROOT route rather than `(tabs)/settings/currency`, for the reason the
// subscription detail is one: pushed over the tab tree it covers the native tab
// bar outright, and the bar slides away with the push instead of blinking out.
// A floating tab bar over a 156-row list is a control the screen has no use for
// sitting on top of its last row. Settings is still the only door to it.
export default function SettingsCurrencyRoute() {
  const router = useRouter();
  const preferences = useQuery(preferencesQuery());
  const update = useUpdatePreferences();

  return (
    <CurrencyPage
      selected={preferences.data?.preferredCurrency ?? ""}
      onSelect={(preferredCurrency) => {
        // Popping straight away, without waiting on the write: the mutation
        // seeds the cache itself, so the row behind already reads the new code.
        update.mutate({ preferredCurrency });
        router.back();
      }}
    />
  );
}
