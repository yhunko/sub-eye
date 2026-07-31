import type { SubscriptionStatus } from "@subeye/shared";
import { Image, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { m } from "@/shared/i18n";
import { BrandLogo, brandLogoUrl } from "@/shared/ui/brand-logo";
import { colors, LAYOUT_FONT_SCALE_MAX } from "@/shared/ui/theme";

/** A standard (non-large) iOS navigation bar, under the status bar inset. */
const NAV_BAR_HEIGHT = 44;

/**
 * Pushed past the top of the screen so no rounding or device quirk can leave a
 * seam of page background above the banner. It is added to the margin and the
 * padding equally, so the content does not move — only the artwork reaches
 * further up, behind the status bar where nothing can see it.
 */
const OVERSCAN = 12;

// References, not calls — a module-level table must hold the message function or
// the string freezes in whichever locale was active at import.
const STATUS_LABEL: Record<SubscriptionStatus, () => string> = {
  active: m.subs_status_active,
  paused: m.subs_status_paused,
  cancelling: m.subs_status_cancelling,
  cancelled: m.subs_status_cancelled,
};

// Green only means "billing normally" — the two wind-down states share the
// paused amber, and a dead subscription goes grey.
const STATUS_COLOR: Record<SubscriptionStatus, string> = {
  active: colors.accent,
  paused: colors.warning,
  cancelling: colors.warning,
  cancelled: colors.muted,
};

/**
 * The banner's colour is the brand's own favicon, scaled past the header and
 * blurred until it is a wash rather than a picture. No colour extraction, no
 * native module and no async step that would pop the header a frame late: RN's
 * `blurRadius` is a core Image prop, so the tint arrives with the image.
 *
 * The scrim is not decoration. Most favicons are a mark on an opaque WHITE
 * plate, which blurs to a near-white field — without a fixed dark gradient over
 * it the white-on-brand text below would be unreadable for a large share of
 * brands, and unpredictably so.
 */
function Backdrop({ domain }: { domain: string | null }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {domain ? (
        <Image
          accessibilityIgnoresInvertColors
          source={{ uri: brandLogoUrl(domain, 256) }}
          style={styles.backdropImage}
          // Tuned against the 256px favicon this asks for, NOT a bigger number
          // being safer. `blurRadius` blurs the SOURCE at its natural size, so
          // anything past ~30 averages a 256px icon into one flat colour — and
          // since most favicons are a mark on white, that colour is grey. Every
          // brand came out the same pale grey at 55.
          blurRadius={22}
          resizeMode="cover"
        />
      ) : null}
      <View style={styles.scrim} />
    </View>
  );
}

function Segment({
  label,
  value,
  color,
  divided,
}: {
  label: string;
  value: string;
  color?: string;
  divided?: boolean;
}) {
  return (
    <View style={[styles.segment, divided ? styles.segmentDivided : null]}>
      <Text
        style={[styles.segmentValue, color ? { color } : null]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
      >
        {value}
      </Text>
      <Text
        style={styles.segmentLabel}
        numberOfLines={1}
        maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
      >
        {label}
      </Text>
    </View>
  );
}

export function DetailHero({
  name,
  brandDomain,
  status,
  cadence,
  price,
  charged,
  dateLine,
}: {
  name: string;
  brandDomain: string | null;
  status: SubscriptionStatus;
  /** "monthly" / "every 3 months" — what the price is per. */
  cadence: string;
  price: string;
  /** Only set when the subscription is charged in a currency the user does not hold in. */
  charged: string | null;
  /** "Renews 16 March 2026" — already worded for the status by the caller. */
  dateLine: string | null;
}) {
  const dead = status === "cancelled";

  // The banner runs UNDER the glass nav bar rather than starting below it —
  // a coloured card that stops at the header leaves a dark strip above it and
  // reads as a mistake. The ScrollView's automatic inset already places content
  // below the bar, so the hero climbs back out of that inset by exactly the
  // header's height and pays it back as padding.
  //
  // iOS only: the Android header is opaque, so there is nothing to show through
  // and the negative margin would just hide the top of the banner behind it.
  const insets = useSafeAreaInsets();
  const reach =
    Platform.OS === "ios" ? insets.top + NAV_BAR_HEIGHT + OVERSCAN : 0;

  return (
    <View
      style={[
        styles.hero,
        { marginTop: -(16 + reach), paddingTop: 20 + reach },
      ]}
    >
      <Backdrop domain={brandDomain} />

      <View style={styles.identity}>
        <BrandLogo
          name={name}
          brandDomain={brandDomain}
          size={54}
          dimmed={dead}
        />
        <View style={styles.identityText}>
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>
          {dateLine ? (
            <Text style={styles.dateLine} numberOfLines={1}>
              {dateLine}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.bar}>
        <Segment label={m.detail_segBilling()} value={cadence} />
        {/* The as-charged amount takes the caption slot instead of a line of its
            own. "Amount" only ever restated the number above it, and the
            currency the card is really billed in appears nowhere else on the
            screen — a cancelled subscription's "last price" is the one thing
            worth displacing it for, and only when there is no second currency.  */}
        <Segment
          label={
            charged ?? (dead ? m.detail_lastPrice() : m.detail_segAmount())
          }
          value={price}
          divided
        />
        <Segment
          label={m.detail_segStatus()}
          value={STATUS_LABEL[status]()}
          color={STATUS_COLOR[status]}
          divided
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Full-bleed: cancels the ScrollView's 16pt padding so the banner runs edge to
  // edge, and `marginTop`/`paddingTop` are set inline because they depend on the
  // safe-area inset. Only the bottom corners are rounded — the top edge is off
  // the screen, not part of a card.
  hero: {
    marginHorizontal: -16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  // Scaled up and saturated before it is blurred, both for the same reason: a
  // favicon is a small mark on a white plate, and blurring it at natural size
  // averages the plate in until every brand comes out the same pale grey. The
  // zoom throws the plate outside the frame so the blur samples the mark, and
  // `saturate` puts back what averaging took out. `brightness` is what keeps a
  // yellow or white brand from lighting the banner up under the scrim.
  backdropImage: {
    ...StyleSheet.absoluteFill,
    width: "100%",
    transform: [{ scale: 2.6 }],
    filter: [{ saturate: 2.6 }, { brightness: 0.85 }],
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    experimental_backgroundImage:
      "linear-gradient(180deg, rgba(15,17,21,0.40) 0%, rgba(15,17,21,0.72) 52%, rgba(15,17,21,0.93) 100%)",
  },

  identity: { flexDirection: "row", alignItems: "center", gap: 14 },
  identityText: { flex: 1, minWidth: 0 },
  name: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: colors.text,
  },
  dateLine: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(242,244,248,0.72)",
  },

  bar: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.09)",
    paddingVertical: 10,
  },
  segment: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  segmentDivided: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: "rgba(255,255,255,0.18)",
  },
  segmentValue: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    textTransform: "capitalize",
    fontVariant: ["tabular-nums"],
  },
  segmentLabel: {
    marginTop: 3,
    fontSize: 10.5,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "rgba(242,244,248,0.55)",
  },
});
