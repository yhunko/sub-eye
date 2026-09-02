import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import {
  type LogoEntry,
  type LogoKind,
  loadLogo,
  logoIsStale,
  readLogo,
} from "@/shared/lib/logos";
import { colors } from "./theme";

// Share of the circle the mark occupies. A symbol arrives on no plate of its
// own, so it is drawn inside the INSCRIBED SQUARE (1/√2) and can never touch the
// clip whatever its aspect — that is what stopped the circle slicing the flat
// top and bottom off Netflix's N. A plate already has the mark baked onto a
// square, so shrinking it that far would leave a small card adrift in the
// circle: it stays nearly full-bleed and accepts losing the corners.
const SYMBOL_INSET = Math.SQRT1_2;
const PLATE_INSET = 0.92;

type LogoState =
  | { status: "pending" }
  | { status: "none" }
  | { status: "ready"; uri: string; plate: boolean };

/**
 * The cached logo for a domain, refreshed in the background when it ages out.
 *
 * "In the background" is the whole point: what is cached renders on the first
 * frame and stays on screen for the entire refresh, so a week-old logo is
 * replaced silently or not at all. `pending` is only ever the very first sight
 * of a brand — there is no loading state for one we have seen before.
 *
 * A FETCH'S RESULT IS HELD IN STATE, not re-read from the cache. Re-reading was
 * the first shape of this and it did not repaint: the walk wrote the entry, the
 * re-render asked for it, and the read came back empty — the row stayed blank
 * until something else re-rendered it. Rendering the object the walk resolved
 * with removes the question. The cache is still read directly on the first
 * render, which is what makes a relaunch instant, and that read is sound: it
 * happens before anything has written.
 */
export function useBrandLogo(
  domain: string | null,
  kind: LogoKind = "symbol",
): LogoState {
  // Keyed by domain because ONE avatar outlives many brands: the add/edit form
  // keeps a single instance mounted across every brand the user picks, and an
  // unkeyed result would show the previous choice's logo for a frame.
  const [loaded, setLoaded] = useState<{
    domain: string;
    entry: LogoEntry | null;
  } | null>(null);

  useEffect(() => {
    if (!domain) return;

    const cached = readLogo(kind, domain);
    if (cached && !logoIsStale(cached)) return;

    let live = true;
    void loadLogo(kind, domain).then((entry) => {
      // `?? cached` is what keeps a refresh silent when it fails: a walk that
      // learned nothing must not drop the logo already on screen.
      if (live) setLoaded({ domain, entry: entry ?? cached });
    });
    return () => {
      live = false;
    };
  }, [domain, kind]);

  if (!domain) return { status: "none" };

  const settled = loaded?.domain === domain;
  const entry = settled ? loaded.entry : readLogo(kind, domain);
  if (entry?.uri)
    return { status: "ready", uri: entry.uri, plate: entry.plate };
  // A stored miss is a final answer, and so is a walk that came back with
  // nothing: both mean the letter tile rather than an empty plate.
  if (entry || settled) return { status: "none" };
  return { status: "pending" };
}

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
  const logo = useBrandLogo(brandDomain);
  // A full circle, not a squircle: a plate-shaped logo is a mark on an opaque
  // white square, and a rounded square leaves that plate reading as a white card
  // behind the mark. Clipped round it reads as the avatar it is meant to be.
  const box = {
    width: size,
    height: size,
    borderRadius: size / 2,
    ...(dimmed ? { opacity: 0.4 } : null),
  };

  if (logo.status !== "ready") {
    // The letter only stands in once we know there is no logo. While one is
    // still on its way the plate is left empty, because a letter that turns
    // into a mark a moment later reads as a glitch.
    return logo.status === "none" ? (
      <View style={[styles.fallback, box]}>
        <Text style={[styles.initial, { fontSize: size * 0.42 }]}>
          {name.trim().charAt(0).toUpperCase() || "?"}
        </Text>
      </View>
    ) : (
      <View style={[styles.plate, box]} />
    );
  }

  const inner = Math.round(size * (logo.plate ? PLATE_INSET : SYMBOL_INSET));

  return (
    <View style={[styles.plate, box]}>
      <Image
        accessibilityIgnoresInvertColors
        source={{ uri: logo.uri }}
        style={{
          width: inner,
          height: inner,
          // A bare mark gets no rounding — there is no plate to clip, and
          // rounding it would bite the mark a second time.
          ...(logo.plate ? { borderRadius: inner / 2 } : null),
        }}
        resizeMode="contain"
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
