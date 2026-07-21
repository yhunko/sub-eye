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

const logoUrl = (domain: string, size: number) => {
  const physical = PixelRatio.getPixelSizeForLayoutSize(size);
  const bucket = FAVICON_SIZES.find((value) => value >= physical) ?? 256;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${bucket}`;
};

export function BrandLogo({
  name,
  brandDomain,
  size = 40,
}: {
  name: string;
  brandDomain: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const box = {
    width: size,
    height: size,
    borderRadius: size / 3,
  };

  if (!brandDomain || failed) {
    return (
      <View style={[styles.fallback, box]}>
        <Text style={[styles.initial, { fontSize: size * 0.42 }]}>
          {name.trim().charAt(0).toUpperCase() || "?"}
        </Text>
      </View>
    );
  }

  return (
    <Image
      accessibilityIgnoresInvertColors
      source={{ uri: logoUrl(brandDomain, size) }}
      style={[styles.image, box]}
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  image: {
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
