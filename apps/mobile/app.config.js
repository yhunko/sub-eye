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
module.exports = ({ config }) => ({
  ...config,
  version: process.env.SUBEYE_BETA_VERSION || config.version,
});
