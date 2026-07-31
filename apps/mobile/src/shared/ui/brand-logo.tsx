import { useState } from "react";
import { Image, PixelRatio, StyleSheet, Text, View } from "react-native";
import { colors } from "./theme";

// ponytail: Google's favicon endpoint rather than a logo SDK or a bundled asset
// set — one URL, no API key, no dependency, and it already serves every domain the
// user can type into the brandDomain field.
//
// The endpoint serves only these discrete sizes. Asking for anything else (this
// used to pass size*2) is rounded DOWN and then upscaled by the view, which is
// what made the logos look soft: a 44pt row is 132 physical px on a 3x screen,
// but we were requesting 88 and being handed 64. Ask for the smallest bucket
// that still covers the box's real pixel size.
const FAVICON_SIZES = [16, 32, 64, 128, 256];

/** Share of the circle's diameter the logo itself occupies. See `inner`. */
const LOGO_INSET = 0.84;

export const brandLogoUrl = (domain: string, size: number) => {
  const physical = PixelRatio.getPixelSizeForLayoutSize(size);
  const bucket = FAVICON_SIZES.find((value) => value >= physical) ?? 256;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${bucket}`;
};

export function BrandLogo({
  name,
  brandDomain,
  size = 40,
  dimmed = false,
}: {
  name: string;
  brandDomain: string | null;
  size?: number;
  /** Drains the colour out of a logo whose subscription is over. */
  dimmed?: boolean;
}) {
  // WHICH domain failed, not merely that one did. The add/edit form keeps a
  // single avatar mounted across every brand the user picks, so a boolean stayed
  // true for the life of the modal and every later choice rendered as the letter
  // tile — the picker looked like it had not applied anything.
  const [failedDomain, setFailedDomain] = useState<string | null>(null);
  // A full circle, not a squircle: most favicons are a logo on an opaque white
  // plate, and a rounded square leaves that plate reading as a white card behind
  // the mark. Clipped round it reads as the avatar it is meant to be.
  const box = {
    width: size,
    height: size,
    borderRadius: size / 2,
    ...(dimmed ? { opacity: 0.4 } : null),
  };
  // Favicons split into two shapes and the circle treats them differently. A
  // mark on a plate (openai, adobe, icloud) has its own margin and survives the
  // clip; a full-bleed one (netflix's N) runs to the canvas edge, and a circle
  // inscribed in that square cuts ~29% off each side — which sliced the flat top
  // and bottom off the N. Insetting the image inside the circle gives the second
  // kind the margin it never had, at the cost of drawing the first kind slightly
  // smaller. Not the inscribed square (0.707), which would guarantee no clipping
  // and leave every plate logo visibly adrift in its own circle.
  const inner = Math.round(size * LOGO_INSET);

  if (!brandDomain || failedDomain === brandDomain) {
    return (
      <View style={[styles.fallback, box]}>
        <Text style={[styles.initial, { fontSize: size * 0.42 }]}>
          {name.trim().charAt(0).toUpperCase() || "?"}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.plate, box]}>
      <Image
        accessibilityIgnoresInvertColors
        // Still the full box's pixel size: the bucket picker rounds DOWN, and
        // asking for the inset size drops a 40pt row from the 128 bucket to 64.
        source={{ uri: brandLogoUrl(brandDomain, size) }}
        style={{ width: inner, height: inner, borderRadius: inner / 2 }}
        resizeMode="contain"
        onError={() => setFailedDomain(brandDomain)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  plate: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  initial: {
    fontWeight: "700",
    color: colors.text,
  },
});
