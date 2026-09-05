import type { ReactNode } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { colors } from "./theme";

/**
 * A sheet's top edge, and its title row where it has one. ANDROID ONLY — it
 * renders nothing on iOS.
 *
 * Two jobs, and the app needs both because the platform does neither.
 *
 * `headerShown: true` is a NO-OP inside a `formSheet` on Android:
 * react-native-screens renders no native stack header there. Every sheet that
 * relied on one therefore lost its title, and the category editor lost more
 * than that — Save and Delete live in that bar and nowhere else (they were
 * moved there precisely because a button under a 120-tile emoji grid sits below
 * the fold), so on Android there was no way to commit a category at all.
 *
 * And it draws the EDGE. `sheetCornerRadius` and `sheetGrabberVisible` are both
 * iOS-only props, and RNS's dimming view is worth about 4/255 over an app this
 * dark — measured, #0f1115 dims to #0b0c0f — so a sheet on `colors.bg` met the
 * page behind it in a seam with no boundary anywhere.
 *
 * A RULE, not a lighter band. Filling this strip with `colors.surface` draws the
 * edge just as well and makes the sheet two different colours joined partway
 * down, which no bottom sheet on either platform is — and it flattens the cards
 * inside, which are `surface` themselves. The border is the only part that was
 * ever doing the work, so it is the only part left: one background throughout,
 * with a hairline where the sheet begins.
 *
 * The corners stay square because the sheet's container clips them: a radius set
 * through `contentStyle` is drawn and then cut off, which was verified before
 * this existed.
 *
 * With no `title` and no actions it is the handle alone — which is all a sheet
 * that writes its own headline into its content needs, and all five of those
 * would otherwise have no top edge either.
 */
export function SheetHeader({
  title,
  leading,
  trailing,
}: {
  /** Omit on a sheet that already writes its own headline into the content. */
  title?: string;
  /** The destructive or dismissing action, on the left. */
  leading?: ReactNode;
  /** The commit action, on the right — where the nav bar puts it on iOS. */
  trailing?: ReactNode;
}) {
  if (Platform.OS !== "android") return null;

  const hasRow = title !== undefined || leading || trailing;

  return (
    <View
      style={[styles.header, hasRow ? styles.headerTitled : styles.headerBare]}
    >
      <View style={styles.handle} />
      {hasRow ? (
        <View style={styles.row}>
          {/* Fixed, equal slots so the title is centred on the sheet rather than
              on whatever is left over — one action on one side would otherwise
              shove it off centre. */}
          <View style={styles.slot}>{leading}</View>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <View style={[styles.slot, styles.slotEnd]}>{trailing}</View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 14,
    paddingBottom: 8,
    paddingHorizontal: 8,
    // A whole point, not `hairlineWidth`: at density 3 the hairline is one
    // physical pixel, and one pixel of rgba white at 16% over a near-black page
    // is not an edge anyone can see.
    borderTopWidth: 1,
    borderTopColor: colors.borderStrong,
    // The gap between the band and whatever the sheet starts with. It is a
    // MARGIN and not padding so the sheet's own background shows through it —
    // padding would just make the band taller, and the first thing under it
    // (a section heading, a headline) sat against the border without it.
    marginBottom: 14,
  },
  // Nothing but the handle, so the band is the handle's own region rather than
  // a title row's height with an empty row in it — and no rule under it, which
  // would be a line across a sheet with nothing above it to divide.
  headerBare: { paddingBottom: 14 },
  // Only under a TITLE: it separates the title from content that scrolls beneath
  // it, which is the divider Material's own sheet header carries.
  headerTitled: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  // Material's drag handle: 32x4, centred. It is decoration here — the sheet is
  // dragged by its whole surface — but it is the glyph that says "this is a
  // sheet, pull it down", and the platform draws none on Android.
  handle: {
    alignSelf: "center",
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
  },
  row: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  // 48 is one HeaderButton, so an empty slot reserves exactly what a filled one
  // takes and the title does not move when an action appears.
  slot: { width: 48, alignItems: "flex-start" },
  slotEnd: { alignItems: "flex-end" },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
    color: colors.text,
  },
});
