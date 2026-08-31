import { Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";
import { m } from "@/shared/i18n";
import { nativeInlineSearchBarChrome } from "@/shared/ui/header";
import { colors } from "@/shared/ui/theme";
import { useSubscriptionForm } from "../model/form-context";
import { BrandList } from "./brand-list";
import { StepFooter, StepHeading, StepScreen } from "./step-chrome";

/**
 * Pick the service's logo by searching for it, instead of knowing its domain.
 *
 * Two jobs, one screen. As `step` it is the FIRST thing a new subscription
 * asks, and it is optional: the button reads "Skip" until something is picked,
 * because nothing else on the form depends on a logo. Pushed from the summary
 * row while editing, it is an ordinary picker that pops on a choice.
 *
 * The list is the only thing that scrolls. The step indicator and the button
 * are fixed, so a list of a hundred brands can use every point between them —
 * scrolling the whole page instead meant the list could only ever be as tall as
 * what was left over.
 *
 * It replaces a free-text "Website" field that asked the user to type
 * `netflix.com` from memory.
 */
export function BrandPickerPage({ step = false }: { step?: boolean }) {
  const router = useRouter();
  const { values, close } = useSubscriptionForm();
  const [search, setSearch] = useState("");

  const picked = values.brandDomain.trim();

  return (
    <>
      <Stack.Screen
        options={{
          title: step ? m.form_titleNew() : m.form_brand(),
          // Step one is the first route in the modal's stack, so it has no back
          // button of its own — and Cancel has to exist on every step.
          ...(step
            ? {
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
              }
            : {}),
          headerSearchBarOptions: {
            ...nativeInlineSearchBarChrome,
            placeholder: m.form_brandSearch(),
            onChangeText: (event) => setSearch(event.nativeEvent.text),
          },
        }}
      />
      <StepScreen>
        {step ? <StepHeading step={1} title={m.form_brand()} /> : null}
        <ScrollView
          style={styles.list}
          contentInsetAdjustmentBehavior={step ? "never" : "automatic"}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <BrandList
            search={search}
            onPicked={step ? undefined : () => router.back()}
          />
        </ScrollView>

        {step ? (
          <StepFooter
            label={picked ? m.common_next() : m.common_skip()}
            onPress={() => router.push("/subscription-form/price")}
          />
        ) : null}
      </StepScreen>
    </>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
});
