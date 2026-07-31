import { useLocalSearchParams } from "expo-router";
import { RenewSheet } from "@/widgets/renew-sheet";

export default function RenewSubscriptionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RenewSheet id={id} />;
}
