const { getDefaultConfig } = require("expo/metro-config");

// Monorepo support (watchFolders + nodeModulesPaths) is auto-detected from the
// bun workspace root by Expo SDK 57 / Metro — no manual wiring needed.
const config = getDefaultConfig(__dirname);

// Metro's transform cache key ignores Babel plugin versions, so worklet code
// transformed by an older react-native-worklets plugin survives an up/downgrade
// and the app throws "[Worklets] Mismatch between JavaScript code version and
// Worklets Babel plugin version" until someone remembers `--clear`. Key the
// cache on the installed version instead.
config.cacheVersion = `worklets-${require("react-native-worklets/package.json").version}`;

module.exports = config;
