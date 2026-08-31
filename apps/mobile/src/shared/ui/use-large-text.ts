import { useWindowDimensions } from "react-native";

/**
 * The OS is at one of its ACCESSIBILITY text sizes.
 *
 * RN's iOS multiplier table steps 1.0 → 1.118 → 1.235 → 1.353 and then jumps
 * straight to 1.786 for AX1, so any threshold inside that gap is the same
 * boundary UIKit calls `isAccessibilityCategory`. Android's scale is continuous
 * and tops out around 2, which lands on the same side of it.
 *
 * Past this point a label and the value beside it no longer share a line at any
 * phone width, so the rows that pair them stack rather than shrinking one of the
 * two into an ellipsis. That is what replaced a `maxFontSizeMultiplier` cap:
 * capping the text is what fails Apple's Larger Text criterion, letting the
 * container change shape is what passes it.
 */
export function useLargeText() {
  return useWindowDimensions().fontScale >= 1.4;
}

/**
 * A `minimumFontScale` that floors at a POINT size rather than at a fraction.
 *
 * `adjustsFontSizeToFit` shrinks relative to the size the OS asked for, so a
 * fixed fraction climbs with Dynamic Type: at the accessibility sizes a headline
 * hits its floor with far more text than fits and UILabel truncates the rest —
 * a silent regression exactly where the setting is supposed to help. Pinning the
 * floor keeps the same room to shrink into at every setting, and the figure
 * still grows, because it only ever shrinks as far as it has to.
 */
export function useShrinkFloor(fontSize: number, floor: number) {
  const { fontScale } = useWindowDimensions();
  return Math.min(1, floor / (fontSize * fontScale));
}
