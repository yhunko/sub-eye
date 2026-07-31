import { useState } from "react";
import { Image, PixelRatio, StyleSheet, Text, View } from "react-native";
import { env } from "@/shared/config/env";
import { colors } from "./theme";

// Google's favicon endpoint serves only these discrete sizes. Asking for
// anything else (this used to pass size*2) is rounded DOWN and then upscaled by
// the view, which is what made the logos look soft: a 44pt row is 132 physical
// px on a 3x screen, but we were requesting 88 and being handed 64. Ask for the
// smallest bucket that still covers the box's real pixel size.
const FAVICON_SIZES = [16, 32, 64, 128, 256];

// Share of the circle the mark occupies. A symbol arrives on no plate of its
// own, so it is drawn inside the INSCRIBED SQUARE (1/√2) and can never touch the
// clip whatever its aspect — that is what stopped the circle slicing the flat
// top and bottom off Netflix's N. A plate already has the mark baked onto a
// square, so shrinking it that far would leave a small card adrift in the
// circle: it stays nearly full-bleed and accepts losing the corners.
const SYMBOL_INSET = Math.SQRT1_2;
const PLATE_INSET = 0.92;

/**
 * Every source we will try for one domain, best first. Each entry says whether
 * what comes back is a bare mark or a mark on a plate, because the two are drawn
 * differently.
 *
 * `fallback/404` on the Brandfetch ones is deliberate: the default is
 * Brandfetch's own wordmark, which would put another company's logo on the
 * user's row. A 404 fails the `Image` and moves us down this list instead.
 *
 * The order is empirical, and the reason there are three Brandfetch entries is
 * that no single one covers every brand:
 *  - `symbol/theme/light` is the pale-ink variant, the only one that is legible
 *    on this app's near-black plate — but it 404s for brands that never stored
 *    one (netflix).
 *  - `symbol` unpinned serves whatever variant a brand does have. Correct for
 *    colourful marks, and the reason monochrome ones must try `light` first:
 *    unpinned, OpenAI comes back near-black on near-black.
 *  - `icon` is the social-profile square. Lowest fidelity of the three and
 *    plate-shaped, but it is the only tier that covers icloud.com.
 */
type LogoSource = { uri: string; plate: boolean };

function logoSources(
  domain: string,
  size: number,
): [LogoSource, ...LogoSource[]] {
  const px = PixelRatio.getPixelSizeForLayoutSize(size);
  const encoded = encodeURIComponent(domain);
  const client = env.BRANDFETCH_CLIENT_ID;

  if (!client) {
    const bucket = FAVICON_SIZES.find((value) => value >= px) ?? 256;
    return [
      {
        uri: `https://www.google.com/s2/favicons?domain=${encoded}&sz=${bucket}`,
        plate: true,
      },
    ];
  }

  const bf = (path: string) =>
    `https://cdn.brandfetch.io/${encoded}/${path}/fallback/404/h/${px}/w/${px}?c=${client}`;

  return [
    { uri: bf("symbol/theme/light"), plate: false },
    { uri: bf("symbol"), plate: false },
    { uri: bf("icon"), plate: true },
  ];
}

/**
 * The opaque, plate-shaped source, for the detail banner that blurs it into a
 * colour wash. Deliberately NOT the symbol tiers the avatar prefers: a bare mark
 * is mostly transparent, and blurring one yields almost no colour at all.
 */
export const brandLogoUrl = (domain: string, size: number) => {
  const sources = logoSources(domain, size);
  return (sources.findLast((source) => source.plate) ?? sources[0]).uri;
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
  // Keyed by domain, not a bare index. The add/edit form keeps a single avatar
  // mounted across every brand the user picks, so a counter that only counted up
  // stayed exhausted for the life of the modal and every later choice rendered
  // as the letter tile — the picker looked like it had not applied anything.
  const [exhausted, setExhausted] = useState<Record<string, number>>({});
  // A full circle, not a squircle: a plate-shaped logo is a mark on an opaque
  // white square, and a rounded square leaves that plate reading as a white card
  // behind the mark. Clipped round it reads as the avatar it is meant to be.
  const box = {
    width: size,
    height: size,
    borderRadius: size / 2,
    ...(dimmed ? { opacity: 0.4 } : null),
  };

  const sources = brandDomain ? logoSources(brandDomain, size) : [];
  const attempt = brandDomain ? (exhausted[brandDomain] ?? 0) : 0;
  const source = sources[attempt];

  if (!brandDomain || !source) {
    return (
      <View style={[styles.fallback, box]}>
        <Text style={[styles.initial, { fontSize: size * 0.42 }]}>
          {name.trim().charAt(0).toUpperCase() || "?"}
        </Text>
      </View>
    );
  }

  const inner = Math.round(size * (source.plate ? PLATE_INSET : SYMBOL_INSET));

  return (
    <View style={[styles.plate, box]}>
      <Image
        accessibilityIgnoresInvertColors
        // Keyed so a failed tier actually remounts onto the next URL rather than
        // reusing the decoded-image cache entry that just failed.
        key={source.uri}
        source={{ uri: source.uri }}
        style={{
          width: inner,
          height: inner,
          // A bare mark gets no rounding — there is no plate to clip, and
          // rounding it would bite the mark a second time.
          ...(source.plate ? { borderRadius: inner / 2 } : null),
        }}
        resizeMode="contain"
        onError={() =>
          setExhausted((current) => ({
            ...current,
            [brandDomain]: attempt + 1,
          }))
        }
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
