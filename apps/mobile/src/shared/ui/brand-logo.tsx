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
 * How long a domain's known-bad tiers are trusted before the ladder is walked
 * again.
 *
 * The memo below records that a source 404'd, which is a fact about the CDN
 * rather than about the brand — a company that adds a light symbol next week
 * should get it. Six hours is short enough that a new logo appears the same
 * day and long enough to cost at most one wasted request per brand per session.
 *
 * This is NOT a cache of the images. Those go through the platform's own HTTP
 * cache, which honours the CDN's `Cache-Control` and revalidates against it, so
 * an updated logo arrives when the server says the old one is stale. It is also
 * why no URL here carries a cache-busting parameter: one would defeat the only
 * real caching in the chain.
 */
const TIER_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * The first source worth trying for a domain, shared across every logo.
 *
 * Tier 1 404s outright for any brand with no light symbol stored, and the
 * per-component state below starts every mount at tier 1 again. The calendar is
 * what made that expensive: it draws the same brand in a day tile and again in
 * the agenda, and the month pager remounts both on every swipe, so a handful of
 * brands produced a steady stream of requests already known to fail.
 *
 * A HEAD START only — it never drives a render. An earlier version of this made
 * the map the source of truth and notified every mounted logo on each advance;
 * several brands then stopped resolving altogether, and rather than keep
 * guessing at a re-render storm this went back to the component state that was
 * already known to work and simply skips what that state would have retried.
 *
 * Deliberately NOT persisted. A tier only ever advances, so one transient
 * failure written to disk would pin a brand to a worse source for good.
 */
const knownBadTiers = new Map<string, { tier: number; at: number }>();

function tierFor(domain: string): number {
  const entry = knownBadTiers.get(domain);
  if (!entry || Date.now() - entry.at > TIER_TTL_MS) return 0;
  return entry.tier;
}

function rememberBadTier(domain: string, tier: number): void {
  if (tierFor(domain) > tier) return;
  knownBadTiers.set(domain, { tier: tier + 1, at: Date.now() });
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
  // The larger of what this instance has tried and what any instance has
  // already ruled out. Local state still drives the re-render; the shared map
  // only removes sources that are known to fail.
  const attempt = brandDomain
    ? Math.max(exhausted[brandDomain] ?? 0, tierFor(brandDomain))
    : 0;
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
        onError={() => {
          rememberBadTier(brandDomain, attempt);
          setExhausted((current) => ({
            ...current,
            [brandDomain]: attempt + 1,
          }));
        }}
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
