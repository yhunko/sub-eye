import { ActionSheetIOS, Alert, Platform } from "react-native";
import { m } from "@/shared/i18n";

type Choice = {
  label: string;
  destructive?: boolean;
  onPress: () => void;
};

/**
 * A choice among several actions, presented by the OS. There is no NiceModal
 * here and no custom dialog component — the navigator owns presentation, so
 * confirms are the platform's own: a real action sheet on iOS, the equivalent
 * Alert with buttons on Android (where ActionSheetIOS does not exist).
 */
export function presentChoice(
  title: string,
  message: string,
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

  Alert.alert(title, message, [
    ...choices.map((choice) => ({
      text: choice.label,
      style: choice.destructive
        ? ("destructive" as const)
        : ("default" as const),
      onPress: choice.onPress,
    })),
    { text: m.common_cancel(), style: "cancel" as const },
  ]);
}
