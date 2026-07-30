import { CategorySheet } from "@/widgets/categories-page";

// A static segment, so it wins over `[id]` — expo-router matches static routes
// before dynamic ones.
export default function NewCategoryRoute() {
  return <CategorySheet />;
}
