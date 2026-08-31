import { useRouter } from "expo-router";
import { CurrencyPage } from "@/widgets/currency-page";
import { useSubscriptionForm } from "@/widgets/subscription-form";

// The seam between the form's draft and the shared picker, in the one layer
// allowed to know both — the same wiring `category/index.tsx` does beside it.
export default function SubscriptionCurrencyRoute() {
  const router = useRouter();
  const { values, set } = useSubscriptionForm();

  return (
    <CurrencyPage
      selected={values.currency}
      onSelect={(currency) => {
        set("currency", currency);
        router.back();
      }}
    />
  );
}
