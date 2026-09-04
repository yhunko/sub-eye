/**
 * The brand wash behind the top of Home, as a STYLE rather than a view.
 *
 * It was a `<View pointerEvents="none" />` positioned over the page, and that
 * shape cost the screen its header glass: `scrollEdgeEffects` resolves the
 * scroll view to blur by walking `subviews[0]` down from the screen, so a
 * decoration rendered before the ScrollView dead-ends the walk and iOS 26 draws
 * no blur at all. Home shipped with a see-through bar for exactly that reason.
 * A background cannot be in front of anything, so this shape cannot regress it.
 *
 * `experimental_backgroundImage` is core React Native — the detail banner's
 * scrim draws its gradient the same way, at no library and no extra view.
 *
 * The radii and centre are the offset box the wash used to live in (460x420
 * anchored at -90,-170), which is what puts the bright centre off screen and
 * leaves only the falloff on the page. An ellipse, not a circle: a disc pools
 * instead of spreading across the header.
 */
export const brandWash = {
  experimental_backgroundImage:
    "radial-gradient(230px 210px at 140px 40px, rgba(51,164,83,0.30), rgba(51,164,83,0.06) 62%, rgba(51,164,83,0) 100%)",
} as const;
