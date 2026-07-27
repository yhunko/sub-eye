import { useLocalSearchParams } from "expo-router";
import { PauseSheet } from "@/widgets/pause-sheet";

export default function PauseSubscriptionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PauseSheet id={id} />;
}
