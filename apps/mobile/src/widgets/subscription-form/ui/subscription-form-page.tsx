import { Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Platform, Pressable, ScrollView, StyleSheet } from "react-native";
import { usePro } from "@/entities/pro";
import { usePricingMenu } from "@/entities/subscription";
import { m } from "@/shared/i18n";
import { presentChoice } from "@/shared/ui/present-choice";
import { colors } from "@/shared/ui/theme";
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
  const { submit, close } = useSubscriptionForm();
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
          headerLeft: () => (
            <Pressable
              onPress={close}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={m.common_cancel()}
            >
              <SymbolView
                name={{ ios: "xmark", android: "close" }}
                size={17}
                tintColor={colors.text}
                weight="semibold"
              />
            </Pressable>
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
                  <Pressable
                    onPress={() =>
                      isPro ? openPricing() : router.push("/paywall")
                    }
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={m.action_managePricing()}
                  >
                    <SymbolView
                      name={{ ios: "tag", android: "sell" }}
                      size={20}
                      tintColor={colors.text}
                      weight="semibold"
                    />
                  </Pressable>
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
