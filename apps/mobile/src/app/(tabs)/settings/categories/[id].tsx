import { useLocalSearchParams } from "expo-router";
import { CategorySheet } from "@/widgets/categories-page";

export default function EditCategoryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CategorySheet id={id} />;
}
