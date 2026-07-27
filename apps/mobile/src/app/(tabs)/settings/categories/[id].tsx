import { useLocalSearchParams } from "expo-router";
import { CategoryEditSheet } from "@/widgets/categories-page";

export default function EditCategoryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CategoryEditSheet id={id} />;
}
