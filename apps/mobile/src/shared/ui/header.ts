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
  ...(Platform.OS === "ios"
    ? ({ headerTransparent: true, scrollEdgeEffects: { top: "soft" } } as const)
    : ({
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
      } as const)),
};
