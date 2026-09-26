import { SubscriptionPeriod } from "@subeye/model";
import { useState } from "react";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { m } from "@/shared/i18n";
import { FormRow } from "@/shared/ui/field";
import { Divider, ROW_INSET } from "@/shared/ui/list-row";
import {
  CYCLES,
  type CycleKey,
  cycleCounts,
  matchCycle,
} from "../model/cadence";
import { useSubscriptionForm } from "../model/form-context";
import {
  CUSTOM_TAG,
  CustomCadencePicker,
  type CycleChoice,
  CyclePicker,
} from "./cadence-picker";
import { messageFor } from "./validation-message";

// Message-function references, invoked at render time — never called at module
// scope, or the string freezes in whichever locale was active at import.
const CYCLE_LABEL: Record<CycleKey, () => string> = {
  daily: m.form_cycleDaily,
  weekly: m.form_cycleWeekly,
  biweekly: m.form_cycleBiweekly,
  monthly: m.form_cycleMonthly,
  quarterly: m.form_cycleQuarterly,
  semiannual: m.form_cycleSemiannual,
  yearly: m.form_cycleYearly,
};

const UNITS = [
  SubscriptionPeriod.DAY,
  SubscriptionPeriod.WEEK,
  SubscriptionPeriod.MONTH,
  SubscriptionPeriod.YEAR,
] as const;

const UNIT_LABEL: Record<SubscriptionPeriod, () => string> = {
  [SubscriptionPeriod.DAY]: m.unit_days,
  [SubscriptionPeriod.WEEK]: m.unit_weeks,
  [SubscriptionPeriod.MONTH]: m.unit_months,
  [SubscriptionPeriod.YEAR]: m.unit_years,
};

/**
 * How often the money leaves: seven cadences in a pop-up menu, and a pair of
 * wheels for the ones it does not cover.
 *
 * The menu opens OVER the row, anchored to it — so there is nothing to scroll
 * into view and nothing below it moves. Two earlier versions did move things: an
 * action sheet, which covered the form it was editing, and an inline disclosure,
 * which grew the card by eight rows and left the options off the bottom of the
 * screen.
 *
 * The custom wheels are the one thing that still changes the page's height, and
 * they are the one thing that animates. THE ANIMATION IS NOT HERE: the height
 * belongs to the card, which eases it and clips to it (`Section`), and to the
 * section below, which slides (`FormSection`). A layout animation only ever
 * moves the view that carries it, which is why an earlier `LinearTransition` on
 * the wrapper played to nobody — it eased a frame with no background while the
 * card, its child, jumped.
 *
 * **There is no fade in.** The card's clip IS the reveal, and a second opacity
 * animation over it costs a whole extra offscreen pass per frame — on a layer
 * whose subtree is a live `UIPickerView`, inside a card that is already
 * offscreen-rendering for its corner radius. Two stacked passes around a
 * 3D barrel is what made the smooth version stutter. The fade OUT stays: it is
 * what holds the view mounted while the card collapses over it.
 */
export function CadenceField() {
  const { values, errors, set } = useSubscriptionForm();

  // `null` until the user says: the wheels follow the DATA, and the choice then
  // pins them. Both halves are load-bearing. Derived alone, "every 1 month" is
  // a preset as well as a legitimate custom answer, so the wheels would close
  // under the finger of anyone who scrolled to it. Seeded alone, the state is
  // read on mount and the form seeds ASYNCHRONOUSLY — edit opens on the
  // defaults, so a subscription billed every 7 days arrived after this had
  // already decided it was monthly, and its wheels never appeared.
  const [pinned, setPinned] = useState<boolean | null>(null);

  const matched = matchCycle(values.every, values.period);
  const custom = pinned ?? matched === undefined;

  const options: { key: CycleChoice; label: string }[] = [
    ...CYCLES.map((cycle) => ({
      key: cycle.key,
      label: CYCLE_LABEL[cycle.key](),
    })),
    { key: CUSTOM_TAG, label: m.form_cycleCustom() },
  ];

  return (
    <>
      <FormRow
        label={m.form_cycle()}
        // Unreachable through the menu or the wheels, both of which only emit
        // whole counts of one and up. It stays wired because the price step
        // still GATES on `every`, and a Next that refuses with nothing on
        // screen is the one failure worse than a visible error.
        error={messageFor(errors.every)}
      >
        <CyclePicker
          options={options}
          value={custom ? CUSTOM_TAG : (matched?.key ?? CUSTOM_TAG)}
          onChange={(next) => {
            if (next === CUSTOM_TAG) {
              setPinned(true);
              return;
            }
            const picked = CYCLES.find((cycle) => cycle.key === next);
            if (!picked) return;
            setPinned(false);
            set("every", String(picked.every));
            set("period", picked.period);
          }}
        />
      </FormRow>

      {custom ? (
        <Animated.View
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(140)}
        >
          {/* Drawn here rather than by `FormSection`, which sees this whole
              component as ONE child and cannot separate the rows inside it. */}
          <Divider inset={ROW_INSET} />
          <FormRow label={m.form_every()}>
            <CustomCadencePicker
              counts={cycleCounts(values.every)}
              every={Number(values.every)}
              onEveryChange={(next) => set("every", String(next))}
              units={UNITS.map((unit) => ({
                value: unit,
                label: UNIT_LABEL[unit](),
              }))}
              period={values.period}
              onPeriodChange={(unit) => set("period", unit)}
            />
          </FormRow>
        </Animated.View>
      ) : null}
    </>
  );
}
