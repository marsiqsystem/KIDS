const fs = require("node:fs");
const path = require("node:path");

/**
 * app.json, plus the one thing that cannot be written into it: Firebase.
 *
 * Push on Android goes through Firebase (FCM), which needs google-services.json
 * from the KIDS Firebase project. That file is private and gitignored — the
 * repo is public — so it is wired in only when it is actually present in this
 * folder. The website's Capacitor app learned why the hard way (build 3, 11 Sep
 * 2026): Firebase configured without its file kills the app on launch, before
 * any of our code runs. Without the file, the app builds and runs, and simply
 * never gets a push token.
 */
module.exports = ({ config }) => {
  const file = path.join(__dirname, "google-services.json");
  if (!fs.existsSync(file)) return config;
  return { ...config, android: { ...config.android, googleServicesFile: "./google-services.json" } };
};
