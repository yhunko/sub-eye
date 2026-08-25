import { useRouter } from "expo-router";
import { CategorySheet } from "@/widgets/categories-page";
import { useSubscriptionForm } from "@/widgets/subscription-form";

// The same sheet Settings creates through, ending somewhere else: saving here
// applies the new category and drops back to the form, rather than to the list
// it was opened from. Stopping at that list would mean pressing the row you
// just created — a screen with no decision left on it.
export default function SubscriptionNewCategoryRoute() {
  const router = useRouter();
  const { set } = useSubscriptionForm();

  return (
    <CategorySheet
      onCreated={(created) => {
        set("categoryId", created.id);
        // TWO screens, not `dismissAll`: the picker is pushed from the edit form
        // AND from step two of the create flow, so the stack under it is not
        // always one deep. This pops the sheet and the picker and nothing else.
        router.dismiss(2);
      }}
    />
  );
}
