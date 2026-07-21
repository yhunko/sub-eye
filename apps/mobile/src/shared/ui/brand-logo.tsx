import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "./theme";

// ponytail: Google's favicon endpoint rather than a logo SDK or a bundled asset
// set — one URL, no API key, no dependency, and it already serves every domain the
// user can type into the brandDomain field. Swap in a real logo CDN only if the
// quality complaint ever materialises.
const logoUrl = (domain: string, size: number) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size * 2}`;

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
