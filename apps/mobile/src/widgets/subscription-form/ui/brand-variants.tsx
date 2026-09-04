import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { m } from "@/shared/i18n";
import {
  LOGO_VARIANTS,
  type LogoEntry,
  type LogoVariant,
  logoFill,
  previewVariant,
} from "@/shared/lib/logos";
import { LogoMark } from "@/shared/ui/brand-logo";
import {
  useChooseLogoVariant,
  useLogoVariant,
} from "@/shared/ui/logo-variants";
import { colors } from "@/shared/ui/theme";

const TILE = 52;

type Preview = { variant: LogoVariant; entry: LogoEntry & { uri: string } };

/**
 * The alternatives to the mark the ladder picked, for one brand.
 *
 * It exists because no automatic rule fits every brand. `icon` is the app icon
 * and the right default — it is the only tier that answered for all 40 brands
 * probed, and it fills the circle in the brand's own colours. But it is an
 * opaque JPEG, so it can never be inset: any margin paints its own background
 * as a ring, which on Spotify's green disc came out white. A brand like Notion,
 * whose icon draws the mark right to its own edge, therefore ends up tight, and
 * the only honest fix is to let the user say "use the bare symbol instead".
 *
 * Only variants that ACTUALLY resolve get a tile: `previewVariant` walks one
 * variant's own paths and does not fall through to another, so a brand with no
 * stored symbol is not offered one that would silently draw its icon.
 * Duplicates go by the bytes — for a good many brands `logo` and `symbol` are
 * the same image, and two identical tiles is a choice that isn't one.
 */
export function BrandVariants({ domain }: { domain: string }) {
  const chosen = useLogoVariant(domain);
  const choose = useChooseLogoVariant();
  // `null` is "still asking", which is NOT the same as "this brand has none" —
  // the row holds its height through the first and only collapses on the second.
  const [previews, setPreviews] = useState<Preview[] | null>(null);

  useEffect(() => {
    let live = true;
    setPreviews(null);

    void Promise.all(
      LOGO_VARIANTS.map(async (variant) => {
        const entry = await previewVariant(domain, variant);
        return entry?.uri
          ? { variant, entry: { ...entry, uri: entry.uri } }
          : null;
      }),
    ).then((found) => {
      if (!live) return;
      const seen = new Set<string>();
      setPreviews(
        found.filter((preview): preview is Preview => {
          if (!preview || seen.has(preview.entry.uri)) return false;
          seen.add(preview.entry.uri);
          return true;
        }),
      );
    });

    return () => {
      live = false;
    };
  }, [domain]);

  // Only a brand with no mark anywhere collapses the row. Waiting for the walk
  // does not: the tiles arrive over the network, so a row that appeared once
  // they landed shoved the list down a beat AFTER the tap that picked the brand
  // — out from under the finger that made it. Reserving the height on the tap
  // spends the same layout change on the gesture that caused it.
  if (previews?.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{m.form_brandStyle()}</Text>
      <View style={styles.group}>
        {previews === null
          ? // The most tiles the row can ever hold, so the placeholder is the
            // widest it will be. Only the HEIGHT matters for the shove, and
            // that is the same for one tile or three.
            LOGO_VARIANTS.map((variant) => (
              <View key={variant} style={styles.tile}>
                <View style={[styles.circle, styles.pending]} />
              </View>
            ))
          : null}
        {previews?.map(({ variant, entry }) => {
          // With nothing chosen the icon tile IS what the ladder draws, so it
          // reads as selected rather than leaving the row looking untouched.
          const selected = chosen ? chosen === variant : variant === "icon";
          return (
            <Pressable
              key={variant}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={m.form_brandStyle()}
              onPress={() => choose(domain, variant)}
              style={[styles.tile, selected && styles.tileSelected]}
            >
              <LogoMark
                uri={entry.uri}
                fill={logoFill(entry)}
                size={TILE}
                style={styles.circle}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  title: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 4,
  },
  group: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 10,
  },
  tile: {
    padding: 3,
    borderRadius: (TILE + 6) / 2,
    borderWidth: 2,
    // Transparent rather than absent, so selecting a tile does not resize it
    // and shove the rest of the row sideways.
    borderColor: "transparent",
  },
  tileSelected: { borderColor: colors.accent },
  pending: { backgroundColor: colors.surfaceAlt },
  circle: { width: TILE, height: TILE, borderRadius: TILE / 2 },
});
