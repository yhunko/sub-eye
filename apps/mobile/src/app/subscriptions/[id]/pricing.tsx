import { useLocalSearchParams } from "expo-router";
import { ManagePricingSheet } from "@/widgets/manage-pricing-sheet";

export default function ManagePricingRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ManagePricingSheet id={id} />;
}
