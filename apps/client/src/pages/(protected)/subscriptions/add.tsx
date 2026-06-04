import { createFileRoute } from "@tanstack/react-router";
import { AddSubscriptionForm } from "@/features/subscription/add-subscription";
import { SubscriptionNativeLayout } from "@/widgets/subscription-native-layout";

export const Route = createFileRoute("/(protected)/subscriptions/add")({
  component: AddSubscriptionPage,
});

function AddSubscriptionPage() {
  return (
    <SubscriptionNativeLayout>
      <AddSubscriptionForm />
    </SubscriptionNativeLayout>
  );
}
