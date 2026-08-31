import {
  router,
  Stack,
  useGlobalSearchParams,
  useLocalSearchParams,
} from "expo-router";
import { useRef } from "react";
import { m } from "@/shared/i18n";
import {
  categorySheetChrome,
  nativeHeaderChrome,
  nativeSearchBarChrome,
} from "@/shared/ui/header";
import {
  categoryAddHeaderOptions,
  categorySearch,
} from "@/widgets/categories-page";
import { currencySearch } from "@/widgets/currency-page";
import { SubscriptionFormProvider } from "@/widgets/subscription-form";

/**
 * The add/edit modal's OWN stack.
 *
 * This layout exists so the form can push sub-screens: the three steps a new
 * subscription is created through, plus the category picker. A formSheet cannot
 * do that without stacking a second sheet on top of itself.
 *
 * The steps are real routes rather than one screen swapping its contents,
 * because each of them wants the native back gesture, and step one declares a
 * real `UISearchBar` — an option a screen can only own if it IS one.
 *
 * The provider wraps the Stack rather than sitting inside a screen, so the form
 * and the picker share one draft and it unmounts with the modal.
 *
 * It sits at the ROOT rather than under `(tabs)/subscriptions`, because Home
 * opens it too — see the root layout's screen for what a cross-tab push did to
 * the presentation animation.
 */
// `subeye:///subscription-form/brand` would otherwise mount the picker as the
// only route in this stack — no back button, and no form for it to write into.
export const unstable_settings = { anchor: "index" };

// The singleton, not `useRouter()`: these options are built once, outside the
// component, so they never carry a hook's identity into a screen descriptor.
const openNewCategory = () => router.push("/subscription-form/category/new");

export default function SubscriptionFormLayout() {
  // `?id=` lands in different places depending on how the modal was opened: a
  // push attaches it to THIS route, a deep link (`subeye:///subscription-form
  // ?id=…`) to the deepest one it built, which is `index`. Read both — and hold
  // the first answer, because walking into step two changes the focused route
  // to one whose own URL has no id, and the form would flip to "create" with a
  // half-edited subscription in it.
  const local = useLocalSearchParams<{ id?: string }>();
  const deepLinked = useGlobalSearchParams<{ id?: string }>();
  const seen = useRef<string | undefined>(undefined);
  seen.current ??= local.id ?? deepLinked.id;
  const id = seen.current;

  return (
    <SubscriptionFormProvider id={id}>
      <Stack
        screenOptions={{
          ...nativeHeaderChrome,
          // Every screen in here is pushed from "New subscription", so the
          // default back label repeated that title on all of them — a whole
          // header slot spent saying where you already know you are. The
          // chevron alone still says "back".
          headerBackButtonDisplayMode: "minimal",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="price" />
        <Stack.Screen name="dates" />
        {/* The picker's chrome is declared HERE and not on the screen: none of
            it depends on anything the screen holds, and options set from inside
            a screen are re-pushed through `navigation.setOptions` on every
            render — which for a search field means rebuilding the whole
            UISearchController once per keystroke. Same reason the subscriptions
            list declares its field on its layout.

            The field only filters now. Typing a name that matched nothing used
            to be the sole way to create one; that is the `+` and the shared
            sheet, so the placeholder is no longer hiding a feature. */}
        <Stack.Screen
          name="category/index"
          options={{
            title: m.form_category(),
            headerSearchBarOptions: {
              ...nativeSearchBarChrome,
              placeholder: m.subs_searchPlaceholder(),
              onChangeText: (event) =>
                categorySearch.set(event.nativeEvent.text),
            },
            ...categoryAddHeaderOptions(openNewCategory),
          }}
        />
        <Stack.Screen name="category/new" options={categorySheetChrome} />
        {/* Same screen Settings pushes, wired to the draft instead of the
            preference — and its field belongs on the layout for the same reason
            the category picker's does. */}
        <Stack.Screen
          name="currency"
          options={{
            title: m.form_currency(),
            headerSearchBarOptions: {
              ...nativeSearchBarChrome,
              placeholder: m.currency_search(),
              onChangeText: (event) =>
                currencySearch.set(event.nativeEvent.text),
            },
          }}
        />
        <Stack.Screen name="brand" />
      </Stack>
    </SubscriptionFormProvider>
  );
}
