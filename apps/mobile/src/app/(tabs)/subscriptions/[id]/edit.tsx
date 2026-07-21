import { useLocalSearchParams } from "expo-router";
import { SubscriptionFormSheet } from "@/widgets/subscription-form-sheet";

export default function EditSubscriptionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SubscriptionFormSheet id={id} />;
}
