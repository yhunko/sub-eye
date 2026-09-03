import { StyleSheet, View } from "react-native";

/**
 * The brand wash behind the top of Home.
 *
 * `experimental_backgroundImage` is core React Native — the detail banner's
 * scrim draws its gradient the same way — so this costs no library, no native
 * module and no extra view tree. A stack of concentric translucent circles,
 * which is the alternative without one, is a dozen views for a worse falloff.
 *
 * It sits BEHIND the page's scroll view rather than inside it, so it stays put
 * while the content moves: the glass nav bar samples what is under it, and a
 * wash that scrolled away would drain the colour out of the bar mid-gesture.
 *
 * Anchored off the top-left corner and larger than the box it starts in, which
 * is what puts the bright centre off screen and leaves only the falloff. The
 * numbers are the design's, in points.
 */
export function HomeGlow() {
  return <View pointerEvents="none" style={styles.glow} />;
}

const styles = StyleSheet.create({
  glow: {
    position: "absolute",
    top: -170,
    left: -90,
    width: 460,
    height: 420,
    // Ellipse, not a circle: `closest-side` on a box wider than it is tall is
    // what spreads the wash across the header instead of pooling in a disc.
    experimental_backgroundImage:
      "radial-gradient(closest-side, rgba(51,164,83,0.30), rgba(51,164,83,0.06) 62%, rgba(51,164,83,0) 100%)",
  },
});
