const { getSentryExpoConfig } = require("@sentry/react-native/metro");

// Monorepo support (watchFolders + nodeModulesPaths) is auto-detected from the
// bun workspace root by Expo SDK 57 / Metro — no manual wiring needed.
//
// getSentryExpoConfig, NOT expo's getDefaultConfig: it is what stamps a Debug ID
// into the bundle and into the source map beside it. The app.json plugin uploads
// maps either way, but without a matching Debug ID Sentry cannot pair them with
// the bundle — every production stack trace stays minified and the whole point
// of the auth token is lost, silently and only in Release.
const config = getSentryExpoConfig(__dirname);

// Metro's transform cache key ignores Babel plugin versions, so worklet code
// transformed by an older react-native-worklets plugin survives an up/downgrade
// and the app throws "[Worklets] Mismatch between JavaScript code version and
// Worklets Babel plugin version" until someone remembers `--clear`. Key the
// cache on the installed version instead.
config.cacheVersion = `worklets-${require("react-native-worklets/package.json").version}`;

module.exports = config;
