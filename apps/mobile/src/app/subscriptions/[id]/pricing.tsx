import { useLocalSearchParams } from "expo-router";
import {
  ManagePricingSheet,
  type SheetIntent,
} from "@/widgets/manage-pricing-sheet";

const INTENTS: SheetIntent[] = ["pending", "schedule", "trial", "intro"];

const asIntent = (value: string | undefined): SheetIntent =>
  // Anything else — a hand-typed deep link, or the confirm-only "end the offer
  // early", which never routes here — lands on the form that always applies.
  INTENTS.find((intent) => intent === value) ?? "schedule";

export default function ManagePricingRoute() {
  const { id, intent } = useLocalSearchParams<{
    id: string;
    intent?: string;
  }>();
  return <ManagePricingSheet id={id} intent={asIntent(intent)} />;
}
