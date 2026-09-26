import type { NativeStackHeaderItem } from "expo-router";
import { Stack, useRouter } from "expo-router";
import { Platform, ScrollView, StyleSheet } from "react-native";
import { usePro } from "@/entities/pro";
import { usePricingMenu } from "@/entities/subscription";
import { m } from "@/shared/i18n";
import { HeaderButton } from "@/shared/ui/header-button";
import { presentChoice } from "@/shared/ui/present-choice";
import { useSubscriptionForm } from "../model/form-context";
import { BrandPickerPage } from "./brand-picker-page";
import { DatesFields, PriceFields } from "./form-fields";
import { StepFooter, StepScreen } from "./step-chrome";

/**
 * Add and Edit are one route: `id` present on the provider means edit.
 *
 * Creating, the form is a SEQUENCE — brand, then price, then dates — because a
 * blank form is a long list of decisions and nothing on it is answerable out of
 * order. Editing, every answer already exists and there is nothing to sequence,
 * so it is one page: scroll to the thing you came to change and save.
 */
export function SubscriptionFormPage() {
  const { id } = useSubscriptionForm();
  return id ? <EditForm id={id} /> : <BrandPickerPage step />;
}

function EditForm({ id }: { id: string }) {
  const router = useRouter();
  const isPro = usePro();
  const { submit, close, dirty } = useSubscriptionForm();
  // In the nav bar, not a row at the bottom of the form: pricing is the reason
  // most people open Edit on a subscription they already have, and below the
  // fold is the one place it must not be.
  const pricing = usePricingMenu(id);

  const openPricing = () =>
    presentChoice(
      m.pricing_title(),
      m.action_managePricing(),
      pricing.map((item) => ({ label: item.label, onPress: item.run })),
    );

  // A close button that throws away typing has to ask first — and asking has to
  // come OUT OF that button, which is what a menu on a native bar item does:
  // iOS morphs the button into the confirmation, so the question is visibly
  // attached to the control that raised it. A modal alert in the middle of the
  // screen is the same words with none of that.
  //
  // Only when there is something to lose. An untouched form dismissing through
  // a confirmation is a tax on the common case.
  const closeItem: NativeStackHeaderItem = dirty
    ? {
        type: "menu",
        label: m.common_cancel(),
        icon: { type: "sfSymbol", name: "xmark" },
        menu: {
          title: m.form_discardTitle(),
          // Same reason as the pricing menu: a selection menu makes UIKit tick
          // whichever item was last opened and leave the tick there.
          multiselectable: true,
          items: [
            {
              type: "action",
              label: m.form_discardConfirm(),
              destructive: true,
              onPress: close,
            },
          ],
        },
      }
    : {
        type: "button",
        label: m.common_cancel(),
        icon: { type: "sfSymbol", name: "xmark" },
        onPress: close,
      };

  const confirmClose = () => {
    if (!dirty) {
      close();
      return;
    }
    presentChoice(m.form_discardTitle(), undefined, [
      { label: m.form_discardConfirm(), destructive: true, onPress: close },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: m.form_titleEdit(),
          // Explicitly cleared: on a cold deep link the id arrives a frame late,
          // so the brand step mounts first and installs a search field on this
          // very screen — and `setOptions` MERGES, so omitting the key leaves it
          // sitting in the nav bar of a form that has nothing to search.
          headerSearchBarOptions: undefined,
          unstable_headerLeftItems: () => [closeItem],
          // expo-router only swaps the native items in on iOS; Android gets the
          // same question through the platform's own dialog.
          headerLeft:
            Platform.OS === "ios"
              ? undefined
              : () => (
                  <HeaderButton
                    ios="xmark"
                    android="close"
                    label={m.common_cancel()}
                    onPress={confirmClose}
                    size={17}
                    weight="semibold"
                  />
                ),
          // A real UIMenu on iOS. Locked, the same slot becomes a plain button
          // to the paywall — an action that exists for some users and not
          // others reads as a bug.
          unstable_headerRightItems: !pricing.length
            ? undefined
            : () => [
                isPro
                  ? {
                      type: "menu",
                      label: m.action_managePricing(),
                      icon: { type: "sfSymbol", name: "tag" },
                      menu: {
                        title: m.pricing_title(),
                        // These are LINKS, not a choice. A menu defaults to
                        // `UIMenuOptionsSingleSelection`, which makes UIKit manage the
                        // "on" state itself: it ticked whichever one you last opened and
                        // left the tick there, so the menu claimed a trial was running
                        // because you had looked at the form once.
                        multiselectable: true,
                        items: pricing.map((item) => ({
                          type: "action" as const,
                          label: item.label,
                          description: item.subtitle,
                          icon: {
                            type: "sfSymbol" as const,
                            name: item.icon.ios,
                          },
                          onPress: item.run,
                        })),
                      },
                    }
                  : {
                      type: "button",
                      label: m.action_managePricing(),
                      icon: { type: "sfSymbol", name: "tag" },
                      onPress: () => router.push("/paywall"),
                    },
              ],
          // expo-router only swaps the native items in on iOS.
          headerRight:
            Platform.OS === "ios" || !pricing.length
              ? undefined
              : () => (
                  <HeaderButton
                    ios="tag"
                    android="sell"
                    label={m.action_managePricing()}
                    onPress={() =>
                      isPro ? openPricing() : router.push("/paywall")
                    }
                    size={20}
                    weight="semibold"
                  />
                ),
        }}
      />
      <StepScreen>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          <PriceFields
            onChangeBrand={() => router.push("/subscription-form/brand")}
          />
          <DatesFields />
        </ScrollView>

        <StepFooter label={m.form_save()} onPress={submit} />
      </StepScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
});
