// Marketing version by release channel. The build number auto-increments via EAS
// (eas.json `appVersionSource: remote` + `autoIncrement`) and renders as the
// "(42)" beside the version — so beta pins a fixed marketing string and lets the
// build number do the moving: TestFlight shows "4.0.0 (42)". iOS forbids a
// suffix like "4.0.0-42", so the build number cannot live in the marketing
// string. Production keeps the deliberate semver from app.json, which is bumped
// by hand and deliberately NOT synced from package.json: semantic-release
// publishes 5.0.0-beta.1 on dev, and a prerelease suffix is not a valid
// CFBundleShortVersionString — iOS rejects the build.
//
// THE PIN IS OPT-IN, AND THAT DIRECTION IS THE WHOLE FIX. This used to read
// `EAS_BUILD_PROFILE === "production"` and fall back to the beta string, but
// eas-cli evaluates this file locally with that variable UNSET — so every
// profile took the fallback and `--profile production` build 14 went out
// stamped 4.0.0 while app.json said 5.0.0. A default that is wrong for the one
// build that reaches users is the wrong default: absent now means the real
// version, and only a profile that explicitly asks for the pin gets it.
// `eas.json` sets it on `development` and `preview`, where a profile's `env`
// block IS applied to this evaluation.
//
// Plain JS (not .ts) on purpose: eas-cli reads this config under Node and its
// TypeScript loader chokes on app.config.ts.

// Opt-in identity suffix, opt-in for exactly the reason the version pin above
// is: absent means the real app.
//
// Without it a local `expo run:ios` shares `cc.subeye.app` with the App Store
// install and lands ON TOP of it — same container, and the same iCloud
// key-value store, because the ubiquity entitlement is keyed on
// $(CFBundleIdentifier). A debug session's test subscriptions then sync to the
// phone you actually use. With a suffix it is a second app on the home screen
// and neither side can see the other's data.
//
// The App Group is deliberately NOT suffixed: `WIDGET_APP_GROUP` in
// shared/lib/widget/sync.ts and `WidgetStore.appGroup` in Swift spell it as a
// constant, and a suffix they do not follow fails SILENTLY —
// `UserDefaults(suiteName:)` hands back a store that simply never sees the
// writes. ponytail: both App IDs join the one group, so the two builds share
// only the widget snapshot and the last one foregrounded wins it. Thread the
// group through the target's Info.plist if that ever stops being cosmetic.
//
// Both new App IDs — `cc.subeye.app<suffix>` and its widget — need registering
// BY HAND on the Apple Developer portal with App Groups and iCloud enabled.
// EXPO_NO_CAPABILITY_SYNC=1 is permanent here, so nothing does it for you.
const suffix = process.env.SUBEYE_BUNDLE_SUFFIX;
const tag = (suffix || "").replace(/\W/g, "");

module.exports = ({ config }) => ({
  ...config,
  version: process.env.SUBEYE_BETA_VERSION || config.version,
  ...(suffix && {
    name: `${config.name} ${tag}`,
    // Two apps claiming `subeye://` leaves every deep link resolving to
    // whichever one iOS feels like that morning.
    scheme: config.scheme + tag,
    ios: {
      ...config.ios,
      bundleIdentifier: config.ios.bundleIdentifier + suffix,
    },
    android: { ...config.android, package: config.android.package + suffix },
  }),
});
