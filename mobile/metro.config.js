const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

/**
 * Metro, as Expo makes it — plus one test-only switch.
 *
 * KIDS_WEB_TEST=1 lets the app run in a desktop browser for automated
 * end-to-end testing (`npx expo start --web`): the phone-only modules that have
 * no web build are swapped for the small stand-ins in test/web-shims. Without
 * the variable this file changes nothing, and no phone build ever sees a shim.
 */
const config = getDefaultConfig(__dirname);

if (process.env.KIDS_WEB_TEST === "1") {
  const shim = (f) => path.join(__dirname, "test", "web-shims", f);
  const SHIMS = {
    "expo-secure-store": shim("secure-store.js"),
    "expo-notifications": shim("notifications.js"),
    "expo-sqlite/kv-store": shim("kv-store.js"),
    "expo-application": shim("application.js"),
  };
  const upstream = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === "web" && SHIMS[moduleName]) return { type: "sourceFile", filePath: SHIMS[moduleName] };
    return upstream ? upstream(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = config;
