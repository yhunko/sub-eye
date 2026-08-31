import { useLocalSearchParams } from "expo-router";
import { SubscriptionDetailPage } from "@/widgets/subscription-detail";

export default function SubscriptionDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SubscriptionDetailPage id={id} />;
}
