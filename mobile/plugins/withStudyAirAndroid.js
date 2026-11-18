const {
  AndroidConfig,
  withAndroidColors,
  withAndroidManifest,
} = require("expo/config-plugins");

/**
 * Configures StudyAir Android manifest & color resources during Expo prebuild:
 * - Enables cleartext HTTP traffic for local LAN APK download & version checks.
 * - Aligns splashscreen_background and colorPrimary with StudyAir's dark navy palette.
 */
function withStudyAirAndroid(config) {
  config = withAndroidManifest(config, (mod) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      mod.modResults
    );
    application.$["android:usesCleartextTraffic"] = "true";
    return mod;
  });

  config = withAndroidColors(config, (mod) => {
    mod.modResults = AndroidConfig.Colors.assignColorValue(mod.modResults, {
      name: "splashscreen_background",
      value: "#090d16",
    });
    mod.modResults = AndroidConfig.Colors.assignColorValue(mod.modResults, {
      name: "colorPrimary",
      value: "#3b82f6",
    });
    return mod;
  });

  return config;
}

module.exports = withStudyAirAndroid;
