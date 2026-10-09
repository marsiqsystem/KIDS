const { withAppBuildGradle } = require("expo/config-plugins");

/**
 * Sign Android release builds made on this laptop with the KIDS release key —
 * the same key the Capacitor app was signed with, so a phone that has the old
 * app installed updates to this one in place (same package, same signature,
 * higher versionCode).
 *
 * The key and its passwords never enter this repo (it is public). The build
 * reads them from a keystore.properties file whose path is given in the
 * environment variable KIDS_SIGNING_PROPERTIES at build time:
 *
 *     KIDS_SIGNING_PROPERTIES=C:\...\android\keystore.properties
 *
 * Unset, a release build stays signed with the debug key, as Expo generates it.
 * Builds made by EAS do not use this at all: EAS holds the key itself.
 */
module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    if (gradle.includes("KIDS_SIGNING_PROPERTIES")) return cfg;

    gradle = gradle.replace(
      /signingConfigs \{\n(\s+)debug \{/,
      (m, indent) =>
        `signingConfigs {\n` +
        `${indent}// The KIDS release key, when KIDS_SIGNING_PROPERTIES names its properties file.\n` +
        `${indent}def kidsSigning = System.getenv("KIDS_SIGNING_PROPERTIES")\n` +
        `${indent}if (kidsSigning != null && new File(kidsSigning).exists()) {\n` +
        `${indent}    def p = new Properties()\n` +
        `${indent}    new File(kidsSigning).withInputStream { p.load(it) }\n` +
        `${indent}    release {\n` +
        `${indent}        storeFile file(p["storeFile"])\n` +
        `${indent}        storePassword p["storePassword"]\n` +
        `${indent}        keyAlias p["keyAlias"]\n` +
        `${indent}        keyPassword p["keyPassword"]\n` +
        `${indent}    }\n` +
        `${indent}}\n` +
        `${indent}debug {`,
    );

    gradle = gradle.replace(
      /(release \{\n(?:\s+\/\/[^\n]*\n)*\s+)signingConfig signingConfigs\.debug/,
      `$1signingConfig signingConfigs.findByName("release") ?: signingConfigs.debug`,
    );

    cfg.modResults.contents = gradle;
    return cfg;
  });
};
