import { useEffect, useState } from "react";
import {
  Image,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import {
  type LogoEntry,
  type LogoKind,
  type LogoVariant,
  loadLogo,
  logoFill,
  logoIsStale,
  readLogo,
} from "@/shared/lib/logos";
import { useLogoVariant } from "./logo-variants";
import { colors } from "./theme";

type LogoState =
  | { status: "pending" }
  | { status: "none" }
  | { status: "ready"; uri: string; fill: number };

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
    variant: LogoVariant | null;
    entry: LogoEntry | null;
  } | null>(null);

  // Context, so a change in the picker re-renders every avatar in the app
  // without a remount — and only the brands whose value actually moved.
  const variant = useLogoVariant(domain);

  useEffect(() => {
    if (!domain) return;

    const cached = readLogo(kind, domain, variant);
    if (cached && !logoIsStale(cached)) return;

    let live = true;
    void loadLogo(kind, domain, variant).then((entry) => {
      // `?? cached` is what keeps a refresh silent when it fails: a walk that
      // learned nothing must not drop the logo already on screen.
      if (live) setLoaded({ domain, variant, entry: entry ?? cached });
    });
    return () => {
      live = false;
    };
    // `variant` is a dependency, not a bystander: a new variant means a new
    // cache key, which is a different logo to fetch for the same domain.
  }, [domain, kind, variant]);

  if (!domain) return { status: "none" };

  // Both, because a variant switched mid-flight resolves a walk for the mark
  // the user just moved away from.
  const settled = loaded?.domain === domain && loaded.variant === variant;
  const entry = settled ? loaded.entry : readLogo(kind, domain, variant);
  if (entry?.uri)
    return { status: "ready", uri: entry.uri, fill: logoFill(entry) };
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

  return <LogoMark uri={logo.uri} fill={logo.fill} size={size} style={box} />;
}

/**
 * One logo in one circle. Split out so the variant picker can draw a mark it
 * has fetched but not chosen — `BrandLogo` resolves the CHOSEN variant, which
 * is exactly what a tile of the alternatives must not do.
 */
export function LogoMark({
  uri,
  fill,
  size,
  style,
}: {
  uri: string;
  fill: number;
  size: number;
  style?: StyleProp<ViewStyle>;
}) {
  const inner = Math.round(size * fill);

  return (
    <View style={[styles.plate, style]}>
      <Image
        accessibilityIgnoresInvertColors
        source={{ uri }}
        style={{
          width: inner,
          height: inner,
          // A filling plate is clipped back to the circle it is filling. An
          // inset mark already fits inside that circle, and rounding it there
          // would bite the mark a second time.
          ...(fill === 1 ? { borderRadius: inner / 2 } : null),
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
