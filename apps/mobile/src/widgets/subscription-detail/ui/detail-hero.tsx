import type { SubscriptionStatus } from "@subeye/model";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { m } from "@/shared/i18n";
import { BrandBackdrop } from "@/shared/ui/brand-backdrop";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { colors } from "@/shared/ui/theme";
import { useLargeText, useShrinkFloor } from "@/shared/ui/use-large-text";

/**
 * What `contentInsetAdjustmentBehavior="automatic"` actually insets the scroll
 * view by, under the status bar — MEASURED, not the 44pt a standard bar is
 * documented at. iOS 26 lays a glass bar out taller than that and sits its
 * controls near the top of the band.
 *
 * There is no `useHeaderHeight` to ask — `@react-navigation/elements` is not in
 * this tree — so this is a constant. It is only ever used to place the logo
 * against the bar's own controls, so a point or two out moves the logo a point
 * or two and nothing else.
 */
const NAV_BAR_INSET = 57;

/** Where the bar's two capsules begin, down from the safe-area inset. */
const NAV_ITEM_TOP = 3;

/**
 * Pushed past the top of the screen so no rounding or device quirk can leave a
 * seam of page background above the banner. It is added to the margin and the
 * padding equally, so the content does not move — only the artwork reaches
 * further up, behind the status bar where nothing can see it.
 */
const OVERSCAN = 12;

/**
 * How far the banner reaches ABOVE the screen, so a rubber-band pull cannot drag
 * page background into view behind it.
 *
 * The hero scrolls with the content, so on an overscroll it travels down and
 * whatever sits above it is exposed — a hard black strip under the nav bar,
 * which is the same seam `OVERSCAN` exists to prevent, just produced by a
 * gesture instead of by rounding. Extending the artwork past any reachable pull
 * is cheaper than an animated stretchy header: no scroll handler, no
 * `Animated.ScrollView`, and nothing that runs per frame.
 *
 * It is added to the margin AND paid back as padding, so no content moves — only
 * the artwork grows upward into space that is off-screen at rest.
 */
const OVERSCROLL_REACH = 420;

/**
 * The banner's whole subject, so it takes the room a subject takes.
 *
 * Fixed at every Dynamic Type setting: a logo is a picture, not text, and the
 * calendar's tiles and the month strip keep theirs the same size for the same
 * reason. The name under it is what grows.
 */
const LOGO = 108;

/** The name's design size, and the point size it may never shrink past. */
const NAME_SIZE = 26;
const NAME_FLOOR = 18;

/** A segment value's design size, and the point size it may never shrink past. */
const SEGMENT_SIZE = 15;
const SEGMENT_FLOOR = 11;

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
  const stacked = useLargeText();

  return (
    <View
      style={[
        styles.segment,
        stacked && styles.segmentStacked,
        divided
          ? stacked
            ? styles.segmentRuled
            : styles.segmentDivided
          : null,
      ]}
    >
      <Text
        style={[styles.segmentValue, color ? { color } : null]}
        // A third of a phone is not a line to shrink into. Down the column each
        // segment has the full width and nothing left to fight over, so the
        // value simply wraps.
        numberOfLines={stacked ? undefined : 1}
        adjustsFontSizeToFit={!stacked}
        minimumFontScale={useShrinkFloor(SEGMENT_SIZE, SEGMENT_FLOOR)}
      >
        {value}
      </Text>
      <Text style={styles.segmentLabel}>{label}</Text>
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
  // Three segments across a capsule at the accessibility sizes is three columns
  // of one syllable each. It becomes a stack, and the pill becomes a card.
  const stacked = useLargeText();

  const nameFloor = useShrinkFloor(NAME_SIZE, NAME_FLOOR);

  const insets = useSafeAreaInsets();
  const reach =
    Platform.OS === "ios"
      ? insets.top + NAV_BAR_INSET + OVERSCAN + OVERSCROLL_REACH
      : 0;

  // The logo's TOP edge lands on the NAV BAR's own, immediately under the status
  // bar, so the mark reads as chrome with a control either side of it rather
  // than as the first thing below the bar.
  //
  // `reach` is the climb paid back as padding, which lands content exactly where
  // it would have been without it; taking the bar's height back off that lifts
  // the logo INTO the bar. It renders behind the two buttons — a transparent
  // header draws over the scroll view — and it is centred, so the only thing
  // that could collide with them is a logo wider than the gap between them.
  // Android's header is opaque and cannot be reached under, so it keeps a plain
  // inset.
  const padTop =
    Platform.OS === "ios" ? reach - NAV_BAR_INSET + NAV_ITEM_TOP : 20;

  return (
    <View
      style={[styles.hero, { marginTop: -(16 + reach), paddingTop: padTop }]}
    >
      <BrandBackdrop domain={brandDomain}>
        {/* TWO scrims, not one stretched over the taller box. The gradient's own
            stops are percentages, so covering the overscroll reach with it would
            slide 52% and 100% down with the extra height and leave the VISIBLE
            band sitting in the dark end of the ramp — the brand wash would go
            uniformly murky. Instead the reach gets a flat scrim at exactly the
            gradient's 0% value, which makes the join invisible, and the gradient
            keeps the geometry it was tuned for. */}
        <View style={styles.scrimReach} />
        <View style={styles.scrim} />
      </BrandBackdrop>

      {/* Centred under the nav bar, which now holds nothing but a back chevron
          and the ellipsis — so the logo sits between the two controls and the
          banner answers "which subscription is this" and nothing else. Beside
          the name it had 298pt to work with and "Amazon" at 78pt broke
          MID-WORD; under it, both have the whole width. */}
      <View style={styles.identity}>
        <BrandLogo
          name={name}
          brandDomain={brandDomain}
          size={LOGO}
          dimmed={dead}
        />
        {/* Two lines and then it SHRINKS, rather than wrapping freely. "Adobe
            Creative Cloud" at the accessibility sizes broke mid-word — "Creativ
            / e Cloud" — because a single word was wider than the phone, which
            no amount of width fixes. The floor is a point size, so the name
            still grows with Dynamic Type; it just stops growing past what the
            screen can set. */}
        <Text
          style={styles.name}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={nameFloor}
        >
          {name}
        </Text>
        {dateLine ? <Text style={styles.dateLine}>{dateLine}</Text> : null}
      </View>

      <View style={[styles.bar, stacked && styles.barStacked]}>
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
  // Only the part of the banner that is ever on screen at rest. `top` is the
  // overscroll reach, so this begins exactly where the flat scrim above it ends
  // and at the same 0.40 — one continuous wash across the join.
  //
  // It lands on rgba(…,1), the page's own background, rather than short of it:
  // at 0.93 the banner ended on a colour a shade off `colors.bg` and its rounded
  // bottom read as a card edge under the capsule. Fully opaque, the wash simply
  // becomes the page and the corners stop being visible at all.
  scrim: {
    position: "absolute",
    top: OVERSCROLL_REACH,
    left: 0,
    right: 0,
    bottom: 0,
    experimental_backgroundImage:
      "linear-gradient(180deg, rgba(15,17,21,0.40) 0%, rgba(15,17,21,0.72) 52%, rgba(15,17,21,1) 100%)",
  },
  // The reach itself: a flat scrim at the gradient's starting value. Only ever
  // seen mid-pull, and only the last few points of it.
  scrimReach: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: OVERSCROLL_REACH,
    backgroundColor: "rgba(15,17,21,0.40)",
  },

  identity: { alignItems: "center", alignSelf: "stretch" },
  name: {
    marginTop: 14,
    fontSize: NAME_SIZE,
    fontWeight: "800",
    letterSpacing: -0.6,
    textAlign: "center",
    color: colors.text,
  },
  dateLine: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
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
  // A stack of full-width rows, so the capsule's radius has to come down with
  // it — 999 on a tall box is a lozenge with its corners eating the text.
  barStacked: {
    flexDirection: "column",
    borderRadius: 20,
    paddingHorizontal: 4,
  },
  // The triple rather than `flex: 1`, so `segmentStacked` can put the basis
  // back: down a column, basis 0 collapses the segment to no height.
  segment: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  segmentStacked: {
    flexGrow: 0,
    flexBasis: "auto",
    alignSelf: "stretch",
    alignItems: "flex-start",
  },
  segmentDivided: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: "rgba(255,255,255,0.18)",
  },
  // The same rule turned through 90°, now that the segments sit above and below
  // each other rather than beside.
  segmentRuled: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.18)",
  },
  segmentValue: {
    fontSize: SEGMENT_SIZE,
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
