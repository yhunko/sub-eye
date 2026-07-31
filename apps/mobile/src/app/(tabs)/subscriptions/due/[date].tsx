import { useLocalSearchParams } from "expo-router";
import { DuePage } from "@/widgets/subscriptions-page";

export default function DueRoute() {
  const { date } = useLocalSearchParams<{ date: string }>();
  return <DuePage date={date} />;
}
