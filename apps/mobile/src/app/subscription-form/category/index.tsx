import { useRouter } from "expo-router";
import { CategoriesPage } from "@/widgets/categories-page";
import { useSubscriptionForm } from "@/widgets/subscription-form";

// The seam between two widgets, in the one layer allowed to know both. The
// categories screen is shared with Settings and knows nothing about the form;
// the form's draft is a context this route already sits inside. Wiring them
// anywhere else would be a widget importing a sibling widget.
export default function SubscriptionCategoryRoute() {
  const router = useRouter();
  const { values, set } = useSubscriptionForm();

  return (
    <CategoriesPage
      pick={{
        selectedId: values.categoryId,
        onSelect: (categoryId) => {
          set("categoryId", categoryId);
          router.back();
        },
      }}
    />
  );
}
