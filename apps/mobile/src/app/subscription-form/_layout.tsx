import { Stack, useLocalSearchParams } from "expo-router";
import { nativeHeaderChrome } from "@/shared/ui/header";
import { SubscriptionFormProvider } from "@/widgets/subscription-form";

/**
 * The add/edit modal's OWN stack.
 *
 * This layout exists so the form can push sub-screens — today the category
 * picker, tomorrow anything else that outgrows an action sheet. A formSheet
 * cannot do that without stacking a second sheet on top of itself.
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
  const { id } = useLocalSearchParams<{ id?: string }>();

  return (
    <SubscriptionFormProvider id={id}>
      <Stack screenOptions={nativeHeaderChrome}>
        <Stack.Screen name="index" />
        <Stack.Screen name="category" />
        <Stack.Screen name="brand" />
      </Stack>
    </SubscriptionFormProvider>
  );
}
