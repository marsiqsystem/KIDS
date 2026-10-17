const fs = require("node:fs");
const path = require("node:path");

/**
 * app.json, plus the two things that cannot be written into it.
 *
 * Firebase. Push on Android goes through Firebase (FCM), which needs
 * google-services.json from the KIDS Firebase project. That file is private and
 * gitignored — the repo is public — so it is wired in only when it is actually
 * present in this folder. The website's Capacitor app learned why the hard way
 * (build 3, 11 Sep 2026): Firebase configured without its file kills the app on
 * launch, before any of our code runs. Without the file, the app builds and
 * runs, and simply never gets a push token.
 *
 * Over-the-air updates. expo-updates fetches new screens from EAS Update at
 * https://u.expo.dev/<project id>. The id exists only once the company's Expo
 * account has run `eas init`, which writes extra.eas.projectId into app.json.
 * Until then there is no url, expo-updates switches itself off and the app runs
 * the screens it was built with. A store build without the url can never take
 * an update, which is why scripts/check-release.mjs refuses to pass without it.
 */
module.exports = ({ config }) => {
  let next = config;

  const projectId = config.extra?.eas?.projectId;
  if (projectId) next = { ...next, updates: { ...next.updates, url: `https://u.expo.dev/${projectId}` } };

  // A local build reads the file from this folder; an EAS cloud build never
  // uploads gitignored files, so there it arrives as the file secret
  // GOOGLE_SERVICES_JSON (eas env:create --type file).
  const file = process.env.GOOGLE_SERVICES_JSON ?? (fs.existsSync(path.join(__dirname, "google-services.json")) ? "./google-services.json" : null);
  if (file) next = { ...next, android: { ...next.android, googleServicesFile: file } };

  return next;
};
