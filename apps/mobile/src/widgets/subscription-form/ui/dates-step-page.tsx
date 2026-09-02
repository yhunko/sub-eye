import { Stack, useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { m } from "@/shared/i18n";
import { useSubscriptionForm } from "../model/form-context";
import { DatesFields } from "./form-fields";
import { StepFooter, StepHeading, StepScreen } from "./step-chrome";

/** Step three: when it starts, and whether it starts cheap. Then save. */
export function DatesStepPage() {
  const { submit, close } = useSubscriptionForm();

  // A save that offers reminders leaves this screen mounted UNDER the sheet, so
  // that the offer arrives over the form rather than after it has closed. This
  // is what finishes the job when the sheet goes away — and it must run for a
  // swipe as much as for Done, because the subscription is already written by
  // then and a step-3 the user can tap Save on again is a second subscription.
  //
  // Both halves are load-bearing. `blurred` is what stops this firing in the
  // frame between pushing the sheet and the sheet taking focus, which would
  // dismiss the form out from under it. And the callback has NO dependencies —
  // `close` is a fresh closure on every render of the provider, and depending on
  // it would re-run this on every render, cleanup included, so `blurred` would
  // go true while the screen was never actually blurred.
  const saved = useRef(false);
  const blurred = useRef(false);
  const closeForm = useRef(close);
  closeForm.current = close;

  useFocusEffect(
    useCallback(() => {
      if (saved.current && blurred.current) closeForm.current();
      return () => {
        blurred.current = true;
      };
    }, []),
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: m.form_titleNew(),
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
        <StepFooter
          label={m.form_save()}
          onPress={() => {
            saved.current = submit();
          }}
        />
      </StepScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 40 },
});
