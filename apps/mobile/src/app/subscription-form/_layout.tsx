import {
  Stack,
  useGlobalSearchParams,
  useLocalSearchParams,
} from "expo-router";
import { useRef } from "react";
import { nativeHeaderChrome } from "@/shared/ui/header";
import { SubscriptionFormProvider } from "@/widgets/subscription-form";

/**
 * The add/edit modal's OWN stack.
 *
 * This layout exists so the form can push sub-screens: the three steps a new
 * subscription is created through, plus the category picker. A formSheet cannot
 * do that without stacking a second sheet on top of itself.
 *
 * The steps are real routes rather than one screen swapping its contents,
 * because each of them wants the native back gesture, and step one declares a
 * real `UISearchBar` — an option a screen can only own if it IS one.
 *
 * The provider wraps the Stack rather than sitting inside a screen, so the form
 * and the picker share one draft and it unmounts with the modal.
 *
 * It sits at the ROOT rather than under `(tabs)/subscriptions`, because Home
 * opens it too — see the root layout's screen for what a cross-tab push did to
 * the presentation animation.
 */
// `subeye:///subscription-form/brand` would otherwise mount the picker as the
// only route in this stack — no back button, and no form for it to write into.
export const unstable_settings = { anchor: "index" };

export default function SubscriptionFormLayout() {
  // `?id=` lands in different places depending on how the modal was opened: a
  // push attaches it to THIS route, a deep link (`subeye:///subscription-form
  // ?id=…`) to the deepest one it built, which is `index`. Read both — and hold
  // the first answer, because walking into step two changes the focused route
  // to one whose own URL has no id, and the form would flip to "create" with a
  // half-edited subscription in it.
  const local = useLocalSearchParams<{ id?: string }>();
  const deepLinked = useGlobalSearchParams<{ id?: string }>();
  const seen = useRef<string | undefined>(undefined);
  seen.current ??= local.id ?? deepLinked.id;
  const id = seen.current;

  return (
    <SubscriptionFormProvider id={id}>
      <Stack screenOptions={nativeHeaderChrome}>
        <Stack.Screen name="index" />
        <Stack.Screen name="price" />
        <Stack.Screen name="dates" />
        <Stack.Screen name="category" />
        <Stack.Screen name="brand" />
      </Stack>
    </SubscriptionFormProvider>
  );
}
