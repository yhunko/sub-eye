import { Stack } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { m } from "@/shared/i18n";
import { useSubscriptionForm } from "../model/form-context";
import { DatesFields } from "./form-fields";
import { StepFooter, StepHeading, StepScreen } from "./step-chrome";

/** Step three: when it starts, and whether it starts cheap. Then save. */
export function DatesStepPage() {
  const { submit } = useSubscriptionForm();

  return (
    <>
      <Stack.Screen
        options={{
          title: m.form_titleNew(),
          headerBackButtonDisplayMode: "minimal",
        }}
      />
      <StepScreen>
        <StepHeading step={3} title={m.form_stepDates()} />
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={styles.content}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          <DatesFields />
        </ScrollView>
        <StepFooter label={m.form_save()} onPress={submit} />
      </StepScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 40 },
});
