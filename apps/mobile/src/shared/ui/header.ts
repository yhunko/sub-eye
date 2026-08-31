import { Platform } from "react-native";
import { colors } from "./theme";

// The app's native header chrome, spread into each screen's Stack /
// Stack.Screen options. iOS 26 liquid-glass (translucent bar + soft scroll-edge
// fade) on iOS; an OPAQUE bar on Android — glass is iOS-only there, and a
// transparent header on Android leaves scroll content stacked UNDER the bar
// because `scrollEdgeEffects` and the ScrollView's
// `contentInsetAdjustmentBehavior` are BOTH iOS no-ops (an opaque header makes
// the navigator lay content out below it instead).
//
// Never set headerStyle.backgroundColor or headerBlurEffect on iOS: a solid
// background kills the glass, and headerBlurEffect paints a permanent gray
// chrome band over the near-black app while also overlapping scrollEdgeEffects.
export const nativeHeaderChrome = {
  headerTintColor: colors.text,
  headerTitleStyle: { color: colors.text },
  // Dark screen surface. The root Stack sets this too, but it does not cascade
  // into the per-tab nested Stacks — without it here, tab screens fall back to
  // React Navigation's light default and the translucent glass chrome reflects
  // white (near-invisible light-on-light header title).
  contentStyle: { backgroundColor: colors.bg },
  ...(Platform.OS === "ios"
    ? ({ headerTransparent: true, scrollEdgeEffects: { top: "soft" } } as const)
    : ({
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
      } as const)),
};

// The app's search-field chrome, spread into a screen's `headerSearchBarOptions`
// — the search counterpart of `nativeHeaderChrome`. Three screens carry a field:
// the list, the category picker and the brand picker.
//
// `placement: "stacked"` + `hideWhenScrolling: false` is a real UISearchBar
// pinned under the nav bar that never leaves. Not `automatic`: UIKit picks the
// placement itself there and can put the field in a bottom toolbar on iPhone.
//
// The platform's own pull-down-to-reveal (`true`, as Mail and Settings do) was
// tried and reverted. It reads well and it removes the placeholder flash below
// for free — nothing is rendered to repaint — but the reveal needs the content
// to out-measure the screen, and buying that with a height floor on the list
// leaves a short list scrollable into blank space. A field that is simply
// always there costs nothing and hides nothing.
//
// `barTintColor` is NOT styling — it sets `searchTextField.backgroundColor`, and
// leaving it unset is what made the field flash near-WHITE for ~200ms every time
// its screen came back to the top of the stack. UIKit's default fill is
// translucent light: it reads dark-grey while it has the app's own near-black
// behind it, and blows out over whatever a push/pop transition puts there
// instead. Measured returning from a subscription — the band around the field
// peaked at 0.47 luminance against a resting 0.11, for 12 frames. An opaque fill
// has nothing to sample and cannot flash. An older note claimed a custom
// barTintColor renders the magnifier glyph black; it does not on
// react-native-screens 4.25 — verified on iOS 26.
export const nativeSearchBarChrome = {
  placement: "stacked" as const,
  hideWhenScrolling: false,
  autoCapitalize: "none" as const,
  tintColor: colors.accent,
  textColor: colors.text,
  barTintColor: colors.surfaceAlt,
};

// The app's form-sheet chrome. Every sheet in the app is a native `formSheet`
// route — the navigator owns presentation, so there is no dialog manager
// anywhere — and all of them want the same grabber and the same dark surface.
//
// A FIXED tall detent rather than `fitToContents`: every sheet that spreads this
// holds a `flex: 1` ScrollView, which has no intrinsic height, so asking the
// sheet to size itself to its contents can measure to nothing. A sheet that
// cannot overflow (the pause date field) overrides the detent instead.
//
// `as const` on the whole object would make `sheetAllowedDetents` a readonly
// tuple, which the navigator's mutable `number[]` will not accept — so only the
// string literals are pinned.
export const nativeSheetChrome = {
  presentation: "formSheet" as const,
  sheetGrabberVisible: true,
  sheetAllowedDetents: [0.9],
  headerShown: false,
  contentStyle: { backgroundColor: colors.bg },
};

// The category editor's sheet — the one sheet in the app that KEEPS its header.
// Save and delete used to be buttons under a 120-tile emoji grid, which put both
// of them below the fold of a 0.9 detent: committing a name you had already
// typed meant scrolling past every emoji first. The sheet's own nav bar is the
// only slot that cannot scroll away.
//
// `headerShown` has to be set back on explicitly — `nativeSheetChrome` turns it
// off, and spreading `nativeHeaderChrome` only STYLES a header, it does not
// enable one.
//
// Shared because two stacks present this sheet: Settings creates and edits
// through it, and the subscription form creates through it.
export const categorySheetChrome = {
  ...nativeSheetChrome,
  ...nativeHeaderChrome,
  headerShown: true,
};

// The same field, moved into the nav bar itself (iOS 26 `integrated`).
//
// The form's brand step has a step indicator to show before anything else, and
// `stacked` is a full-width band that always sits between the title and the
// content — so the indicator ended up UNDER the search field, which is not what
// the step is. Integrated, the field is a trailing item in the nav bar and the
// content starts where the design says it starts.
//
// `allowToolbarIntegration: false` is load-bearing: left at its default, UIKit
// is free to move the field into a bottom toolbar on iPhone, which is exactly
// where this screen's own Next button lives.
export const nativeInlineSearchBarChrome = {
  ...nativeSearchBarChrome,
  placement: "integrated" as const,
  allowToolbarIntegration: false,
};
