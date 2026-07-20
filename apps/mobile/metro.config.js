const { getDefaultConfig } = require("expo/metro-config");

// Monorepo support (watchFolders + nodeModulesPaths) is auto-detected from the
// bun workspace root by Expo SDK 57 / Metro — no manual wiring needed.
module.exports = getDefaultConfig(__dirname);
