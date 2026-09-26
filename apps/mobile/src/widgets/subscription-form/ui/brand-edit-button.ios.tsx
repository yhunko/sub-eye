import { Button, Host, Image } from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  font,
} from "@expo/ui/swift-ui/modifiers";
import { StyleSheet } from "react-native";
import { m } from "@/shared/i18n";
import { colors } from "@/shared/ui/theme";

/**
 * The real thing: `.buttonStyle(.glass)` on a real SwiftUI `Button`.
 *
 * Nothing in JS reproduces Liquid Glass — it samples what is behind it, bends
 * the light through its edge, and morphs on press. Hosting the button is the
 * only way to get any of that, and it costs nothing new: `@expo/ui` is already
 * a dependency and `ExpoUI` is already in the build.
 *
 * The button IS the SwiftUI content rather than a shape laid over an RN label,
 * which is the trap `cadence-picker.ios.tsx` documents — glass playing across
 * text that never took part in it. Here there is no RN inside the capsule at
 * all, so there is nothing for it to play over.
 *
 * **Nothing is measured, and the button is not framed.** A `Host` has no
 * intrinsic size, so Yoga gives it both dimensions; inside it the glass sizes
 * itself around the glyph the way every system glass button does, and centres.
 * Framing it to the host instead would fix a number that iOS is entitled to
 * change between releases.
 */
export function BrandEditButton({ onPress }: { onPress: () => void }) {
  return (
    <Host style={styles.host} colorScheme="dark">
      <Button
        onPress={onPress}
        modifiers={[
          buttonStyle("glass"),
          buttonBorderShape("circle"),
          accessibilityLabel(m.form_brandChange()),
        ]}
      >
        {/* A point size rather than a text style: this is a control's glyph,
            the same fixed 18pt the Android button draws, and a pencil that
            grows with Dynamic Type would burst the capsule it sits in. */}
        <Image
          systemName="pencil"
          color={colors.text}
          modifiers={[font({ size: 18, weight: "semibold" })]}
        />
      </Button>
    </Host>
  );
}

// The same 44 the Android button uses. NOT imported from it: on iOS Metro
// resolves `./brand-edit-button` to THIS file, so the pair cannot share a
// constant — they share the contract instead, and change together.
const SIZE = 44;

const styles = StyleSheet.create({
  host: { width: SIZE, height: SIZE },
});
