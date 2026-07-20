// Marketing version by release channel. The build number auto-increments via EAS
// (eas.json `appVersionSource: remote` + `autoIncrement`) and renders as the
// "(42)" beside the version — so beta pins a fixed marketing string and lets the
// build number do the moving: TestFlight/Play show "4.0.0 (42)". iOS forbids a
// suffix like "4.0.0-42", so the build number cannot live in the marketing
// string. Production keeps the deliberate semver from app.json, bumped by hand.
//
// Plain JS (not .ts) on purpose: eas-cli reads this config under Node and its
// TypeScript loader chokes on app.config.ts.
const BETA_VERSION = "4.0.0";

const isProduction = process.env.EAS_BUILD_PROFILE === "production";

module.exports = ({ config }) => ({
  ...config,
  version: isProduction ? config.version : BETA_VERSION,
});
