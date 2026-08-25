import { Stack, useRouter } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { m } from "@/shared/i18n";
import { useSubscriptionForm } from "../model/form-context";
import { PRICE_STEP_FIELDS, PriceFields } from "./form-fields";
import { StepFooter, StepHeading, StepScreen } from "./step-chrome";

/**
 * Step two: what it is called, what it costs, how often.
 *
 * Next validates only what this screen shows. Running the whole form here would
 * surface an offer error on a step the user has not reached, and pushing on
 * without checking would surface a name error on a step they have left.
 */
export function PriceStepPage() {
  const router = useRouter();
  const { check } = useSubscriptionForm();

  return (
    <>
      <Stack.Screen
        options={{
          title: m.form_titleNew(),
        }}
      />
      <StepScreen>
        <StepHeading step={2} title={m.form_stepPrice()} />
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={styles.content}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          {/* Back IS the brand step. Pushing the picker would stack a second
              copy of the screen the user just came from. */}
          <PriceFields onChangeBrand={() => router.back()} />
        </ScrollView>
        <StepFooter
          label={m.common_next()}
          onPress={() => {
            if (check(PRICE_STEP_FIELDS)) {
              router.push("/subscription-form/dates");
            }
          }}
        />
      </StepScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 40 },
});
