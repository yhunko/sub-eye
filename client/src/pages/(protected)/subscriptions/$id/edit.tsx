import { EditSubscriptionForm } from "@/features/subscription/edit-subscription";
import { createFileRoute } from "@tanstack/react-router";
import { SubscriptionNativeLayout } from "@/widgets/subscription-native-layout";

export const Route = createFileRoute("/(protected)/subscriptions/$id/edit")({
  component: EditSubscriptionPage,
});

function EditSubscriptionPage() {
  const { id } = Route.useParams();

  return (
    <SubscriptionNativeLayout>
      <EditSubscriptionForm subscriptionId={id} />
    </SubscriptionNativeLayout>
  );
}
