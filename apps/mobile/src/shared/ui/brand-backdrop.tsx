import type { ReactNode } from "react";
import { Image, StyleSheet, View } from "react-native";
import { useBrandLogo } from "./brand-logo";

/**
 * A surface coloured by the brand's own favicon, scaled past the frame and
 * blurred until it is a wash rather than a picture. No colour extraction, no
 * native module and no async step that would pop the surface a frame late:
 * RN's `blurRadius` is a core Image prop, so the tint arrives with the image.
 *
 * THE SCRIM IS THE CALLER'S, and it is not optional. Most favicons are a mark
 * on an opaque WHITE plate, which blurs to a near-white field — without a fixed
 * dark layer over it, white text on top is unreadable for a large share of
 * brands, and unpredictably so. It is a child rather than a prop because it is
 * the one part that genuinely differs: the detail banner needs a vertical ramp
 * for the text at its foot, a card needs one flat value across 60pt.
 *
 * What is shared is the image treatment, and that is the point of this file —
 * every constant below was tuned against the source size `shared/lib/logos.ts`
 * fetches for the plate, so a second copy is a second thing to re-tune.
 */
export function BrandBackdrop({
  domain,
  children,
}: {
  domain: string | null;
  children?: ReactNode;
}) {
  // The PLATE kind, not the avatar's: that one prefers a bare symbol, and a
  // mostly transparent mark blurs to almost no colour at all.
  const logo = useBrandLogo(domain, "plate");

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {logo.status === "ready" ? (
        <Image
          accessibilityIgnoresInvertColors
          source={{ uri: logo.uri }}
          style={styles.image}
          // Tuned against the source size, NOT a bigger number being safer.
          // `blurRadius` blurs the SOURCE at its natural size, so anything past
          // ~30 averages a small icon into one flat colour — and since most
          // plates are a mark on white, that colour is grey. Every brand came
          // out the same pale grey at 55.
          blurRadius={22}
          resizeMode="cover"
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  // Scaled up and saturated before it is blurred, both for the same reason: a
  // favicon is a small mark on a white plate, and blurring it at natural size
  // averages the plate in until every brand comes out the same pale grey. The
  // zoom throws the plate outside the frame so the blur samples the mark, and
  // `saturate` puts back what averaging took out. `brightness` is what keeps a
  // yellow or white brand from lighting the surface up under the scrim.
  image: {
    ...StyleSheet.absoluteFill,
    width: "100%",
    transform: [{ scale: 2.6 }],
    filter: [{ saturate: 2.6 }, { brightness: 0.85 }],
  },
});
