import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import {
  type LogoEntry,
  type LogoKind,
  type LogoWash,
  loadLogo,
  logoDraw,
  logoIsStale,
  readLogo,
} from "@/shared/lib/logos";
import { colors } from "./theme";

/**
 * How far past the circle a `wide` backing is zoomed.
 *
 * Far enough that the circle only ever sees the middle ~40% of the image, which
 * for a transparent mark is the solid inside of the mark itself — iCloud's
 * cloud becomes a blue field. Zooming rather than blurring is deliberate:
 * `blurRadius` is a radius over the DECODED bitmap and RN decodes to the view
 * it is drawing into, so one radius is a different blur at every avatar size.
 * At 40 the 38 pt row came out clean blue and the 108 pt hero came out a dark
 * circle with a crisp cloud, from the same cached image. A scale has no such
 * dependence.
 */
const WIDE_SCALE = 2.4;

type LogoState =
  | { status: "pending" }
  | { status: "none" }
  | { status: "ready"; uri: string; fill: number; wash: LogoWash };

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
    return { status: "ready", uri: entry.uri, ...logoDraw(entry) };
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

  const inner = Math.round(size * logo.fill);
  // An `edge` wash is the plate at exactly the avatar's size, so the ring it
  // leaves showing is the plate's own outer band and matches the inset copy.
  const spread = logo.wash === "wide" ? WIDE_SCALE : 1;
  const backing = Math.round(size * spread);

  return (
    // `overflow: hidden` is what makes the circle a clip rather than a rounded
    // background: a `wide` wash is drawn past the avatar on purpose, and the
    // inset plate's corners fall outside the circle by design.
    <View style={[styles.plate, styles.clip, box]}>
      {logo.wash === "none" ? null : (
        <Image
          accessibilityIgnoresInvertColors
          source={{ uri: logo.uri }}
          style={{
            position: "absolute",
            width: backing,
            height: backing,
            left: Math.round((size - backing) / 2),
            top: Math.round((size - backing) / 2),
          }}
          resizeMode="cover"
        />
      )}
      <Image
        accessibilityIgnoresInvertColors
        source={{ uri: logo.uri }}
        style={{ width: inner, height: inner }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
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
