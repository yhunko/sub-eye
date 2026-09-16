const { withAppDelegate, withInfoPlist } = require("expo/config-plugins");

const legacyDeclaration = "class AppDelegate: ExpoAppDelegate {";
const sceneDeclaration =
  "class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {";

const legacyWindowStart = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

`;

function withSceneInfoPlist(config) {
  return withInfoPlist(config, (nextConfig) => {
    // Let a future Expo template own its scene configuration once it ships one.
    if (!nextConfig.modResults.UIApplicationSceneManifest) {
      nextConfig.modResults.UIApplicationSceneManifest = {
        UIApplicationSupportsMultipleScenes: false,
        UISceneConfigurations: {
          UIWindowSceneSessionRoleApplication: [
            {
              UISceneConfigurationName: "Default Configuration",
              // Expo exports this base delegate to Objective-C under this name.
              // Referencing it directly avoids adding generated Swift files to the
              // ignored Xcode project merely to declare an empty subclass.
              UISceneDelegateClassName: "EXExpoAppSceneDelegate",
            },
          ],
        },
      };
    }
    return nextConfig;
  });
}

function withSceneAppDelegate(config) {
  return withAppDelegate(config, (nextConfig) => {
    if (nextConfig.modResults.language !== "swift") {
      throw new Error(
        "The iOS scene-lifecycle plugin requires a Swift AppDelegate",
      );
    }

    let contents = nextConfig.modResults.contents;
    if (contents.includes(legacyDeclaration)) {
      contents = contents.replace(legacyDeclaration, sceneDeclaration);
    } else if (!contents.includes(sceneDeclaration)) {
      throw new Error(
        "Unable to add ExpoReactNativeFactoryProvider to AppDelegate",
      );
    }

    if (contents.includes(legacyWindowStart)) {
      contents = contents.replace(
        legacyWindowStart,
        "    // ExpoAppSceneDelegate creates the window and starts React Native.\n\n",
      );
    } else if (
      contents.includes("window = UIWindow(frame: UIScreen.main.bounds)")
    ) {
      throw new Error(
        "Unable to migrate AppDelegate window startup to UIScene",
      );
    }

    nextConfig.modResults.contents = contents;
    return nextConfig;
  });
}

module.exports = function withIosSceneLifecycle(config) {
  return withSceneAppDelegate(withSceneInfoPlist(config));
};
