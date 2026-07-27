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
 */
export default function SubscriptionFormLayout() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  return (
    <SubscriptionFormProvider id={id}>
      <Stack screenOptions={nativeHeaderChrome}>
        <Stack.Screen name="index" />
        <Stack.Screen name="category" />
      </Stack>
    </SubscriptionFormProvider>
  );
}
