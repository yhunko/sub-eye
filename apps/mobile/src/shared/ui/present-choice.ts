import { ActionSheetIOS, Platform } from "react-native";
import { m } from "@/shared/i18n";

export type Choice = {
  label: string;
  destructive?: boolean;
  onPress: () => void;
};

export type ChoiceRequest = {
  title: string;
  message?: string;
  choices: Choice[];
};

/**
 * Set by the mounted `ChoiceHost`. A module variable rather than a context,
 * because most callers are event handlers deep in unrelated trees and two of
 * them (`lifecycle-actions`, `use-pricing-menu`) are not components at all.
 *
 * The host lives in its OWN file, and that split is load bearing: those two
 * callers sit on the import graph of `bun:test` suites, and a component here
 * would drag `react-native-safe-area-context` — Flow-typed, unparseable by bun —
 * into every one of them. See `test-preload.ts`.
 */
let present: ((request: ChoiceRequest) => void) | null = null;

/** Wiring for `ChoiceHost`. Nothing else may call this. */
export function setChoicePresenter(
  next: ((request: ChoiceRequest) => void) | null,
): void {
  present = next;
}

/**
 * A choice among several actions, presented by the OS on iOS and by
 * `ChoiceHost` on Android.
 *
 * Android USED to get `Alert.alert` with one button per choice, on the theory
 * that an alert is that platform's action sheet. It is not: an AlertDialog has
 * exactly three button slots (positive, negative, neutral), so RN silently drops
 * every choice past the third and lays the survivors out in a ROW. The billing
 * cycle offered Daily / Weekly / Every 2 weeks and no way to reach Monthly, and
 * the detail screen's overflow lost most of its actions the same way — both
 * without any error. Anything that can grow past two options has to be a list.
 */
export function presentChoice(
  title: string,
  /** The second line. Omitted when the title already asks the whole question. */
  message: string | undefined,
  choices: Choice[],
): void {
  if (Platform.OS === "ios") {
    const options = [
      ...choices.map((choice) => choice.label),
      m.common_cancel(),
    ];
    const destructiveIndex = choices.findIndex((choice) => choice.destructive);

    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        message,
        options,
        cancelButtonIndex: options.length - 1,
        // findIndex yields -1 when nothing is destructive, which UIKit reads as
        // a real index; undefined is what it expects for "none".
        ...(destructiveIndex >= 0
          ? { destructiveButtonIndex: destructiveIndex }
          : {}),
      },
      (index) => choices[index]?.onPress(),
    );
    return;
  }

  present?.({ title, message, choices });
}
