/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "SubEyeWidget",
  // Read from the app config rather than repeated here: the app and the
  // extension must be in the SAME group or `UserDefaults(suiteName:)` hands the
  // widget a store that quietly never sees the app's writes.
  entitlements: {
    "com.apple.security.application-groups":
      config.ios.entitlements["com.apple.security.application-groups"],
  },
});
